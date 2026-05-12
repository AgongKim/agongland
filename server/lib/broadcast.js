const WebSocket = require('ws');
const { clients } = require('./state');

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function broadcastAll(data, exclude = null) {
  const json = JSON.stringify(data);
  clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) client.send(json);
  });
}

module.exports = { sanitize, broadcastAll };
