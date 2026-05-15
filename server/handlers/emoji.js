const { broadcastAll } = require('../lib/broadcast');

const ALLOWED = ['❤️', '👍', '🔥', '🎉', '😂', '👏'];
const CHAT_DEDUPE_MS = 1500;
const lastChatByUser = new Map();

function handleEmoji(ws, msg, nickname) {
  if (!ALLOWED.includes(msg.emoji)) return;
  broadcastAll({ type: 'emoji', emoji: msg.emoji, nickname });

  const now = Date.now();
  const last = lastChatByUser.get(nickname);
  if (last && last.emoji === msg.emoji && now - last.time < CHAT_DEDUPE_MS) {
    lastChatByUser.set(nickname, { emoji: msg.emoji, time: now });
    return;
  }
  lastChatByUser.set(nickname, { emoji: msg.emoji, time: now });

  const d = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  broadcastAll({ type: 'chat', nickname, text: msg.emoji, time }, ws);
}

module.exports = { handleEmoji };
