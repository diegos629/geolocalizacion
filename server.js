const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = __dirname;
const port = 8000;
const dataFile = path.join(root, '.gmac-data.json');
let pairing = loadPairing();
let latestAlert = null;
let sharedHistory = [];

function loadPairing() {
  try {
    const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    return {
      code: String(saved.code || ''),
      phone: String(saved.phone || ''),
      tutorPhone: String(saved.tutorPhone || ''),
      createdAt: Number(saved.createdAt || 0),
      confirmedAt: Number(saved.confirmedAt || 0),
      tutorEmail: String(saved.tutorEmail || '')
    };
  } catch (error) {
    return { code: '', phone: '', tutorPhone: '', createdAt: 0, confirmedAt: 0, tutorEmail: '' };
  }
}

function savePairing() {
  fs.writeFileSync(dataFile, JSON.stringify(pairing, null, 2));
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

function serveFile(request, response) {
  const requestedPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.slice(1);
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');

  if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, { ok: true, service: 'GMAC' });
    return;
  }

  if (requestUrl.pathname === '/api/pairing' && request.method === 'GET') {
    const requestedCode = String(requestUrl.searchParams.get('code') || '').replace(/\s+/g, '').toUpperCase();
    if (requestedCode && requestedCode !== pairing.code) {
      sendJson(response, 404, { error: 'Codigo de vinculacion no encontrado' });
      return;
    }
    sendJson(response, 200, pairing);
    return;
  }

  if (requestUrl.pathname === '/api/pairing' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const data = JSON.parse(body);
        const code = String(data.code || '').replace(/\s+/g, '').toUpperCase();
        if (!code) {
          sendJson(response, 400, { error: 'Falta el codigo' });
          return;
        }
        pairing = {
          code,
          phone: String(data.phone || '').replace(/\D/g, ''),
          tutorPhone: String(data.tutorPhone || '').replace(/\D/g, ''),
          createdAt: Date.now(),
          confirmedAt: 0,
          tutorEmail: ''
        };
        sharedHistory = [];
        savePairing();
        sendJson(response, 200, { ok: true, code });
      } catch (error) {
        sendJson(response, 400, { error: 'Solicitud invalida' });
      }
    });
    return;
  }

  if (requestUrl.pathname === '/api/pairing/confirm' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const data = JSON.parse(body);
        const code = String(data.code || '').replace(/\s+/g, '').toUpperCase();
        const tutorEmail = String(data.tutorEmail || '').trim().toLowerCase();
        const tutorPhone = String(data.tutorPhone || '').replace(/\D/g, '');
        if (!code || code !== pairing.code) {
          sendJson(response, 409, { ok: false, error: 'Codigo no valido' });
          return;
        }
        pairing.confirmedAt = Date.now();
        pairing.tutorEmail = tutorEmail;
        pairing.tutorPhone = tutorPhone;
        savePairing();
        sendJson(response, 200, { ok: true, confirmedAt: pairing.confirmedAt, tutorEmail });
      } catch (error) {
        sendJson(response, 400, { error: 'Solicitud invalida' });
      }
    });
    return;
  }

  if (requestUrl.pathname === '/api/history' && request.method === 'GET') {
    const code = String(requestUrl.searchParams.get('code') || '').replace(/\s+/g, '').toUpperCase();
    if (!code || code !== pairing.code) {
      sendJson(response, 409, { error: 'Codigo no valido' });
      return;
    }
    sendJson(response, 200, { entries: sharedHistory });
    return;
  }

  if (requestUrl.pathname === '/api/history' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const data = JSON.parse(body);
        const code = String(data.code || '').replace(/\s+/g, '').toUpperCase();
        if (!code || code !== pairing.code || !Array.isArray(data.entries)) {
          sendJson(response, 400, { error: 'Datos del historial invalidos' });
          return;
        }
        sharedHistory = data.entries.slice(-200);
        sendJson(response, 200, { ok: true, count: sharedHistory.length });
      } catch (error) {
        sendJson(response, 400, { error: 'Solicitud invalida' });
      }
    });
    return;
  }

  if (requestUrl.pathname === '/api/alert' && request.method === 'GET') {
    const code = String(requestUrl.searchParams.get('code') || '').replace(/\s+/g, '').toUpperCase();
    if (!latestAlert || latestAlert.code !== code) {
      sendJson(response, 200, { alert: null });
      return;
    }
    sendJson(response, 200, { alert: latestAlert });
    return;
  }

  if (requestUrl.pathname === '/api/alert' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const data = JSON.parse(body);
        const code = String(data.code || '').replace(/\s+/g, '').toUpperCase();
        const message = String(data.message || '').trim();
        if (!code || !message) {
          sendJson(response, 400, { error: 'Faltan datos de la alerta' });
          return;
        }
        latestAlert = { id: Date.now(), code, message, createdAt: Date.now() };
        sendJson(response, 200, { ok: true, alert: latestAlert });
      } catch (error) {
        sendJson(response, 400, { error: 'Solicitud invalida' });
      }
    });
    return;
  }

  if (request.method === 'GET') {
    serveFile(request, response);
    return;
  }

  response.writeHead(405);
  response.end('Method not allowed');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`GMAC disponible en http://localhost:${port}`);
  const interfaces = os.networkInterfaces();
  const addresses = Object.values(interfaces)
    .flat()
    .filter((network) => network && network.family === 'IPv4' && !network.internal)
    .map((network) => `http://${network.address}:${port}`);
  addresses.forEach((address) => console.log(`Desde el celular usa: ${address}`));
});
