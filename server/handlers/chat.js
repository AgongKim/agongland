const { sanitize, broadcastAll } = require('../lib/broadcast');

function handleChat(ws, msg, nickname) {
  const text = sanitize(msg.text);
  if (!text || text.length > 300) return;
  broadcastAll({
    type: 'chat',
    nickname,
    text,
    time: (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })(),
  }, ws);
}

module.exports = { handleChat };
