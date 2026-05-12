const { sanitize, broadcastAll } = require('../lib/broadcast');

function handleChat(ws, msg, nickname) {
  const text = sanitize(msg.text);
  if (!text || text.length > 300) return;
  broadcastAll({
    type: 'chat',
    nickname,
    text,
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  }, ws);
}

module.exports = { handleChat };
