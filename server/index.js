const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const { getLocalIP, isPrivateIP } = require('./lib/network');
const { clients, songs, recommendations } = require('./lib/state');
const { sanitize, broadcastAll } = require('./lib/broadcast');
const { handleChat } = require('./handlers/chat');
const { handleSongs } = require('./handlers/songs');
const { handleRecs } = require('./handlers/recs');
const { handleEmoji } = require('./handlers/emoji');

const PORT = process.env.PORT || 8080;
const LOCAL_IP = getLocalIP();
const BASE_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const file = path.join(BASE_DIR, 'public', 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else if (req.method === 'GET' && req.url === '/qr') {
    const url = `http://${LOCAL_IP}:${PORT}`;
    QRCode.toBuffer(url, { width: 200, margin: 2 }, (err, buffer) => {
      if (err) { res.writeHead(500); res.end(); return; }
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(buffer);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ server });

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
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      const name = sanitize(msg.nickname);
      if (!name) {
        ws.send(JSON.stringify({ type: 'error', text: '닉네임을 입력해주세요.' }));
        return;
      }
      nickname = name;
      clients.add(ws);
      ws.send(JSON.stringify({ type: 'joined', nickname, count: clients.size }));
      ws.send(JSON.stringify({ type: 'song:list', songs }));
      ws.send(JSON.stringify({ type: 'rec:list', recommendations }));
      console.log(`접속 [${ip}] ${nickname} (${clients.size}명)`);
      return;
    }

    if (!nickname) return;

    if (msg.type === 'chat') return handleChat(ws, msg, nickname);
    if (msg.type === 'emoji') return handleEmoji(ws, msg, nickname);
    if (msg.type.startsWith('song:')) return handleSongs(ws, msg, nickname);
    if (msg.type.startsWith('rec:')) return handleRecs(ws, msg, nickname);
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (nickname) console.log(`퇴장 [${ip}] ${nickname} (${clients.size}명)`);
  });

  ws.on('error', () => ws.terminate());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`채팅 서버 실행 중`);
  console.log(`  로컬:    ws://localhost:${PORT}`);
  console.log(`  내부망:  ws://${LOCAL_IP}:${PORT}`);
});
