const WS_PORT = 8080;

let ws = null;
let wsURL = `ws://localhost:${WS_PORT}`; // WebRTC 감지 실패 시 기본값
let reconnectTimer = null;
let joinData = null;
const ports = new Set();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'agongland') return;
  ports.add(port);

  port.onMessage.addListener((msg) => {
    if (msg.type === 'join') {
      joinData = msg;
    }
    sendToServer(msg);
  });

  port.onDisconnect.addListener(() => {
    ports.delete(port);
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'getQR') return;
  fetch(`http://localhost:${WS_PORT}/qr`)
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      sendResponse({ dataUrl: `data:image/png;base64,${btoa(bin)}` });
    })
    .catch((err) => sendResponse({ error: err.message }));
  return true;
});

function sendToServer(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  } else if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
    connect();
  }
}

function connect() {
  clearTimeout(reconnectTimer);
  try {
    ws = new WebSocket(wsURL);
  } catch {
    reconnectTimer = setTimeout(connect, 5000);
    return;
  }

  ws.onopen = () => {
    if (joinData) ws.send(JSON.stringify(joinData));
  };

  ws.onmessage = ({ data }) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    broadcast(msg);
  };

  ws.onclose = () => {
    reconnectTimer = setTimeout(connect, 5000);
  };

  ws.onerror = () => ws.close();
}

function broadcast(msg) {
  ports.forEach((port) => {
    try { port.postMessage(msg); } catch {}
  });
}
