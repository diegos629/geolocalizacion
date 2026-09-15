import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
PAIRING_TTL_SECONDS = 7 * 24 * 60 * 60
pairing = {"code": "", "createdAt": 0}
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
        if self.path == "/api/pairing":
            with lock:
                self.send_json(200, {"code": pairing["code"], "createdAt": pairing["createdAt"]})
            return
        if self.path == "/api/health":
            self.send_json(200, {"ok": True, "service": "GMAC"})
            return
        super().do_GET()

    def do_POST(self):
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
            pairing["createdAt"] = __import__("time").time()
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
