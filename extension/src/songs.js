let singerCount = 1;

function updateSingerInputs() {
  const countEl = document.getElementById('agl-singers-count');
  const minusBtn = document.getElementById('agl-singers-minus');
  const plusBtn = document.getElementById('agl-singers-plus');
  if (!countEl) return;
  countEl.textContent = singerCount;
  if (minusBtn) minusBtn.disabled = singerCount <= 1;
  if (plusBtn) plusBtn.disabled = singerCount >= 8;
}

function renderSongs(songs) {
  const list = document.getElementById('agl-songs-list');
  const label = document.getElementById('agl-songs-label');
  if (!list) return;
  if (label) label.textContent = `노래 목록 (${songs.length})`;
  list.innerHTML = '';
  songs.forEach((song, idx) => {
    const participants = song.participants && song.participants.length > 0 ? song.participants : [song.nickname];
    const maxP = song.maxParticipants || 1;
    const isFull = participants.length >= maxP;
    const alreadyJoined = participants.includes(nickname);
    const showJoin = maxP > 1 && !isFull && !alreadyJoined;
    const countLabel = maxP > 1 ? ` · ${participants.length}/${maxP}명` : '';
    const participantsText = participants.map(p => `@${p}`).join(', ');

    const div = document.createElement('div');
    div.className = 'agl-song-item' + (idx === 0 ? ' agl-song-current' : '');
    div.dataset.id = song.id;
    div.innerHTML = `
      <span class="agl-song-num">${idx + 1}</span>
      <div class="agl-song-info">
        <span class="agl-song-title${!isFull && maxP > 1 ? ' agl-song-title-joining' : ''}">${song.title}</span>
        <span class="agl-song-user">${participantsText}${countLabel}</span>
      </div>
      <div class="agl-song-actions">
        ${showJoin ? `<button class="agl-song-btn agl-song-join" data-action="join">참여</button>` : ''}
        ${alreadyJoined && isFull && maxP > 1 ? `<span class="agl-song-joined">✓</span>` : ''}
        <button class="agl-song-btn" data-action="up" title="위로">▲</button>
        <button class="agl-song-btn" data-action="down" title="아래로">▼</button>
        <button class="agl-song-btn" data-action="edit" title="수정">✎</button>
        <button class="agl-song-btn" data-action="del" title="삭제">✕</button>
      </div>
    `;
    div.querySelectorAll('.agl-song-btn').forEach(btn => {
      btn.addEventListener('click', () => handleSongAction(song.id, btn.dataset.action, song.title));
    });
    list.appendChild(div);
  });
}

function handleSongAction(id, action, currentTitle) {
  if (action === 'join') port?.postMessage({ type: 'song:join', id });
  if (action === 'up') port?.postMessage({ type: 'song:move', id, direction: 'up' });
  if (action === 'down') port?.postMessage({ type: 'song:move', id, direction: 'down' });
  if (action === 'del') port?.postMessage({ type: 'song:delete', id });
  if (action === 'edit') {
    const item = document.querySelector(`.agl-song-item[data-id="${id}"]`);
    if (!item) return;
    const info = item.querySelector('.agl-song-info');
    const actions = item.querySelector('.agl-song-actions');
    info.innerHTML = `<input class="agl-song-edit-input" value="${currentTitle}" maxlength="100" />`;
    actions.innerHTML = `
      <button class="agl-song-btn agl-song-save">저장</button>
      <button class="agl-song-btn agl-song-cancel">취소</button>
    `;
    const input = info.querySelector('input');
    input.focus();
    input.select();
    actions.querySelector('.agl-song-save').addEventListener('click', () => {
      const title = input.value.trim();
      if (title) port?.postMessage({ type: 'song:edit', id, title });
    });
    actions.querySelector('.agl-song-cancel').addEventListener('click', () => {
      port?.postMessage({ type: 'song:list:request' });
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        const title = input.value.trim();
        if (title) port?.postMessage({ type: 'song:edit', id, title });
      }
      if (e.key === 'Escape') actions.querySelector('.agl-song-cancel').click();
    });
  }
}

function addSong() {
  const input = document.getElementById('agl-song-input');
  const title = input?.value.trim();
  if (!title || !port) return;
  port.postMessage({ type: 'song:add', title, maxParticipants: singerCount });
  input.value = '';
  singerCount = 1;
  updateSingerInputs();
}
