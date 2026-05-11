const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const file = path.join(__dirname, 'public', 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});
const wss = new WebSocket.Server({ server });

const clients = new Set();

const PRIVATE_RANGES = [
  /^127\./,
  /^::1$/,
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::ffff:(127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/,
];

function isPrivateIP(ip) {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return 'localhost';
}

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.socket.remoteAddress;

  if (!isPrivateIP(ip)) {
    console.log(`차단: ${ip}`);
    ws.close(1008, 'Private network only');
    return;
  }

  let nickname = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'join') {
      nickname = sanitize(msg.nickname) || `익명${Math.floor(Math.random() * 9000) + 1000}`;
      clients.add(ws);
      ws.send(JSON.stringify({ type: 'joined', nickname, count: clients.size }));
      broadcastSystem(`${nickname}님이 입장했습니다.`, ws);
      console.log(`접속 [${ip}] ${nickname} (${clients.size}명)`);
    }

    if (msg.type === 'chat' && nickname) {
      const text = sanitize(msg.text);
      if (!text || text.length > 300) return;
      broadcastAll({
        type: 'chat',
        nickname,
        text,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }, ws);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (nickname) {
      broadcastSystem(`${nickname}님이 퇴장했습니다.`);
      console.log(`퇴장 [${ip}] ${nickname} (${clients.size}명)`);
    }
  });

  ws.on('error', () => ws.terminate());
});

function broadcastAll(data, exclude = null) {
  const json = JSON.stringify(data);
  clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) client.send(json);
  });
}

function broadcastSystem(text, exclude = null) {
  const json = JSON.stringify({ type: 'system', text, count: clients.size });
  clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) client.send(json);
  });
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const PORT = process.env.PORT || 8080;
const LOCAL_IP = getLocalIP();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`채팅 서버 실행 중`);
  console.log(`  로컬:    ws://localhost:${PORT}`);
  console.log(`  내부망:  ws://${LOCAL_IP}:${PORT}`);
});
