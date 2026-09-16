import json
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).parent
DATA_FILE = ROOT / ".gmac-data.json"
PAIRING_TTL_SECONDS = 7 * 24 * 60 * 60


def load_pairing():
    try:
        saved = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        return {
            "code": str(saved.get("code", "")),
            "phone": str(saved.get("phone", "")),
            "tutorPhone": str(saved.get("tutorPhone", "")),
            "createdAt": float(saved.get("createdAt", 0)),
            "confirmedAt": float(saved.get("confirmedAt", 0)),
            "tutorEmail": str(saved.get("tutorEmail", "")),
        }
    except (OSError, ValueError, TypeError):
        return {"code": "", "phone": "", "tutorPhone": "", "createdAt": 0, "confirmedAt": 0, "tutorEmail": ""}


pairing = load_pairing()
shared_history = []
lock = threading.Lock()


class GmacHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed_url = urlsplit(self.path)
        if parsed_url.path == "/api/pairing":
            with lock:
                self.send_json(200, pairing)
            return
        if parsed_url.path == "/api/history":
            code = parse_qs(parsed_url.query).get("code", [""])[0].replace(" ", "").upper()
            with lock:
                if not code or code != pairing["code"]:
                    self.send_json(409, {"error": "Codigo no valido"})
                    return
                self.send_json(200, {"entries": shared_history})
            return
        if self.path == "/api/health":
            self.send_json(200, {"ok": True, "service": "GMAC"})
            return
        if self.path.startswith("/api/pairing/confirm"):
            self.send_json(404, {"error": "Ruta no encontrada"})
            return
        super().do_GET()

    def do_POST(self):
        parsed_path = urlsplit(self.path).path
        if parsed_path == "/api/pairing/confirm":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length))
                code = str(data.get("code", "")).replace(" ", "").upper()
                tutor_email = str(data.get("tutorEmail", "")).strip().lower()
                tutor_phone = "".join(character for character in str(data.get("tutorPhone", "")) if character.isdigit())
            except (ValueError, json.JSONDecodeError):
                self.send_json(400, {"error": "Solicitud invalida"})
                return

            with lock:
                if not code or code != pairing["code"]:
                    self.send_json(409, {"ok": False, "error": "Codigo no valido"})
                    return
                pairing["confirmedAt"] = time.time()
                pairing["tutorEmail"] = tutor_email
                pairing["tutorPhone"] = tutor_phone
                DATA_FILE.write_text(json.dumps(pairing, indent=2), encoding="utf-8")
            self.send_json(200, {"ok": True, "confirmedAt": pairing["confirmedAt"], "tutorEmail": tutor_email})
            return

        if parsed_path == "/api/history":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length))
                code = str(data.get("code", "")).replace(" ", "").upper()
                entries = data.get("entries")
            except (ValueError, json.JSONDecodeError):
                self.send_json(400, {"error": "Solicitud invalida"})
                return

            if not code or code != pairing["code"] or not isinstance(entries, list):
                self.send_json(400, {"error": "Datos del historial invalidos"})
                return

            with lock:
                shared_history[:] = entries[-200:]
            self.send_json(200, {"ok": True, "count": len(shared_history)})
            return

        if self.path != "/api/pairing":
            self.send_json(404, {"error": "Ruta no encontrada"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length))
            code = str(data.get("code", "")).strip().upper()
        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error": "Solicitud invalida"})
            return

        if not code:
            self.send_json(400, {"error": "Falta el codigo"})
            return

        with lock:
            pairing["code"] = code
            pairing["createdAt"] = time.time()
            pairing["confirmedAt"] = 0
            pairing["tutorEmail"] = ""
            shared_history.clear()
            DATA_FILE.write_text(json.dumps(pairing, indent=2), encoding="utf-8")
        self.send_json(200, {"ok": True, "code": code})


if __name__ == "__main__":
    host = "0.0.0.0"
    port = 8000
    server = ThreadingHTTPServer((host, port), GmacHandler)
    print(f"GMAC disponible en http://localhost:{port}")
    print("Desde el celular usa la IP de esta PC, por ejemplo: http://192.168.1.20:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.server_close()
