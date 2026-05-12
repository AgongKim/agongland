const { sanitize, broadcastAll } = require('../lib/broadcast');
const { recommendations, nextRecId } = require('../lib/state');

function handleRecs(ws, msg, nickname) {
  if (msg.type === 'rec:add') {
    const title = sanitize(msg.title);
    if (!title || title.length > 100) return;
    const recommendee = msg.recommendee ? sanitize(msg.recommendee) : '';
    recommendations.push({ id: nextRecId(), title, recommender: nickname, recommendee, likedBy: [] });
    broadcastAll({ type: 'rec:list', recommendations });
  }

  if (msg.type === 'rec:edit') {
    const rec = recommendations.find(r => r.id === msg.id);
    if (!rec) return;
    const title = sanitize(msg.title);
    if (title) rec.title = title;
    if (msg.recommendee !== undefined) rec.recommendee = sanitize(msg.recommendee);
    broadcastAll({ type: 'rec:list', recommendations });
  }

  if (msg.type === 'rec:delete') {
    const idx = recommendations.findIndex(r => r.id === msg.id);
    if (idx !== -1) { recommendations.splice(idx, 1); broadcastAll({ type: 'rec:list', recommendations }); }
  }

  if (msg.type === 'rec:like') {
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
}

module.exports = { handleRecs };
