const clients = new Set();
const songs = [];
const recommendations = [];
let songIdSeq = 0;
let recIdSeq = 0;

function nextSongId() { return String(++songIdSeq); }
function nextRecId() { return String(++recIdSeq); }

module.exports = { clients, songs, recommendations, nextSongId, nextRecId };
