function renderRecommendations(recs) {
  const list = document.getElementById('agl-rec-list');
  const label = document.getElementById('agl-rec-label');
  if (!list) return;
  if (label) label.textContent = `노래추천 (${recs.length})`;
  list.innerHTML = '';
  recs.forEach(rec => {
    const liked = rec.likedBy.includes(nickname);
    const meta = rec.recommendee ? `@${rec.recommender} → @${rec.recommendee}` : `@${rec.recommender}`;
    const div = document.createElement('div');
    div.className = 'agl-rec-item';
    div.dataset.id = rec.id;
    div.innerHTML = `
      <div class="agl-rec-info">
        <span class="agl-rec-title">${rec.title}</span>
        <span class="agl-rec-meta">${meta}</span>
      </div>
      <div class="agl-rec-actions">
        <button class="agl-rec-like${liked ? ' liked' : ''}" data-action="like">❤ ${rec.likedBy.length}</button>
        <button class="agl-rec-btn" data-action="edit">✎</button>
        <button class="agl-rec-btn" data-action="del">✕</button>
      </div>
    `;
    div.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleRecAction(rec.id, btn.dataset.action, rec));
    });
    list.appendChild(div);
  });
}

function handleRecAction(id, action, rec) {
  if (action === 'like') { port?.postMessage({ type: 'rec:like', id }); return; }
  if (action === 'del') { port?.postMessage({ type: 'rec:delete', id }); return; }
  if (action === 'edit') {
    const item = document.querySelector(`.agl-rec-item[data-id="${id}"]`);
    if (!item) return;
    const info = item.querySelector('.agl-rec-info');
    const actions = item.querySelector('.agl-rec-actions');
    info.innerHTML = `
      <input class="agl-rec-edit-input" placeholder="노래 제목" value="${rec.title}" maxlength="100" />
      <input class="agl-rec-edit-input" placeholder="추천받는 사람 (선택)" value="${rec.recommendee || ''}" maxlength="12" />
    `;
    actions.innerHTML = `
      <button class="agl-rec-btn agl-rec-save">저장</button>
      <button class="agl-rec-btn agl-rec-cancel">취소</button>
    `;
    const [titleInput, toInput] = info.querySelectorAll('input');
    titleInput.focus();
    const save = () => {
      const title = titleInput.value.trim();
      if (title) port?.postMessage({ type: 'rec:edit', id, title, recommendee: toInput.value.trim() });
    };
    actions.querySelector('.agl-rec-save').addEventListener('click', save);
    actions.querySelector('.agl-rec-cancel').addEventListener('click', () => {
      port?.postMessage({ type: 'rec:list:request' });
    });
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) save();
      if (e.key === 'Escape') actions.querySelector('.agl-rec-cancel').click();
    });
  }
}

function addRecommendation() {
  const titleInput = document.getElementById('agl-rec-title-input');
  const toInput = document.getElementById('agl-rec-to-input');
  const title = titleInput?.value.trim();
  if (!title || !port) return;
  port.postMessage({ type: 'rec:add', title, recommendee: toInput?.value.trim() || '' });
  titleInput.value = '';
  toInput.value = '';
}
