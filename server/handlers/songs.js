const { sanitize, broadcastAll } = require('../lib/broadcast');
const { songs, nextSongId } = require('../lib/state');

function handleSongs(ws, msg, nickname) {
  if (msg.type === 'song:add') {
    const title = sanitize(msg.title);
    if (!title || title.length > 100) return;
    const maxParticipants = Math.min(8, Math.max(1, parseInt(msg.maxParticipants) || 1));
    songs.push({ id: nextSongId(), title, nickname, maxParticipants, participants: [nickname] });
    broadcastAll({ type: 'song:list', songs });
  }

  if (msg.type === 'song:join') {
    const song = songs.find(s => s.id === msg.id);
    if (!song || song.participants.includes(nickname) || song.participants.length >= song.maxParticipants) return;
    song.participants.push(nickname);
    broadcastAll({ type: 'song:list', songs });
  }

  if (msg.type === 'song:edit') {
    const title = sanitize(msg.title);
    const song = songs.find(s => s.id === msg.id);
    if (song && title) { song.title = title; broadcastAll({ type: 'song:list', songs }); }
  }

  if (msg.type === 'song:delete') {
    const idx = songs.findIndex(s => s.id === msg.id);
    if (idx !== -1) { songs.splice(idx, 1); broadcastAll({ type: 'song:list', songs }); }
  }

  if (msg.type === 'song:move') {
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
}

module.exports = { handleSongs };
