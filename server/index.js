const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 8080;
const LOCAL_IP = getLocalIP();

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const file = path.join(__dirname, 'public', 'index.html');
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

const clients = new Set();
const songs = []; // { id, title, nickname, maxParticipants, participants }
let songIdSeq = 0;

const recommendations = []; // { id, title, recommender, recommendee, likedBy }
let recIdSeq = 0;

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

    if (msg.type === 'song:add' && nickname) {
      const title = sanitize(msg.title);
      if (!title || title.length > 100) return;
      const maxParticipants = Math.min(8, Math.max(1, parseInt(msg.maxParticipants) || 1));
      songs.push({ id: String(++songIdSeq), title, nickname, maxParticipants, participants: [nickname] });
      broadcastAll({ type: 'song:list', songs });
    }

    if (msg.type === 'song:join' && nickname) {
      const song = songs.find(s => s.id === msg.id);
      if (!song) return;
      if (song.participants.includes(nickname)) return;
      if (song.participants.length >= song.maxParticipants) return;
      song.participants.push(nickname);
      broadcastAll({ type: 'song:list', songs });
    }

    if (msg.type === 'song:edit' && nickname) {
      const title = sanitize(msg.title);
      const song = songs.find(s => s.id === msg.id);
      if (song && title) { song.title = title; broadcastAll({ type: 'song:list', songs }); }
    }

    if (msg.type === 'song:delete' && nickname) {
      const idx = songs.findIndex(s => s.id === msg.id);
      if (idx !== -1) { songs.splice(idx, 1); broadcastAll({ type: 'song:list', songs }); }
    }

    if (msg.type === 'song:move' && nickname) {
      const idx = songs.findIndex(s => s.id === msg.id);
      const newIdx = msg.direction === 'up' ? idx - 1 : idx + 1;
      if (idx !== -1 && newIdx >= 0 && newIdx < songs.length) {
        [songs[idx], songs[newIdx]] = [songs[newIdx], songs[idx]];
        broadcastAll({ type: 'song:list', songs });
      }
    }

    if (msg.type === 'song:list:request') {
      ws.send(JSON.stringify({ type: 'song:list', songs }));
    }

    if (msg.type === 'rec:add' && nickname) {
      const title = sanitize(msg.title);
      if (!title || title.length > 100) return;
      const recommendee = msg.recommendee ? sanitize(msg.recommendee) : '';
      recommendations.push({ id: String(++recIdSeq), title, recommender: nickname, recommendee, likedBy: [] });
      broadcastAll({ type: 'rec:list', recommendations });
    }

    if (msg.type === 'rec:edit' && nickname) {
      const rec = recommendations.find(r => r.id === msg.id);
      if (!rec) return;
      const title = sanitize(msg.title);
      if (title) rec.title = title;
      if (msg.recommendee !== undefined) rec.recommendee = sanitize(msg.recommendee);
      broadcastAll({ type: 'rec:list', recommendations });
    }

    if (msg.type === 'rec:delete' && nickname) {
      const idx = recommendations.findIndex(r => r.id === msg.id);
      if (idx !== -1) { recommendations.splice(idx, 1); broadcastAll({ type: 'rec:list', recommendations }); }
    }

    if (msg.type === 'rec:like' && nickname) {
      const rec = recommendations.find(r => r.id === msg.id);
      if (!rec) return;
      const likedIdx = rec.likedBy.indexOf(nickname);
      if (likedIdx === -1) rec.likedBy.push(nickname);
      else rec.likedBy.splice(likedIdx, 1);
      broadcastAll({ type: 'rec:list', recommendations });
    }

    if (msg.type === 'rec:list:request') {
      ws.send(JSON.stringify({ type: 'rec:list', recommendations }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (nickname) {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`채팅 서버 실행 중`);
  console.log(`  로컬:    ws://localhost:${PORT}`);
  console.log(`  내부망:  ws://${LOCAL_IP}:${PORT}`);
});
