// chrome.runtime.connect()가 throw하는 이 오류는 try-catch로 잡히지 않는 Chrome 버그
window.addEventListener('error', (e) => {
  if (e.message?.includes('Extension context invalidated')) e.preventDefault();
});

const STORAGE_KEY = 'agongland_nickname';

let port = null;
let nickname = null;
let panel = null;
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  Promise.all([loadNickname(), getLocalIP()]).then(([name, ip]) => {
    cachedIP = ip;
    nickname = name;
    buildUI();
    if (nickname) {
      connectToBackground();
    } else {
      showNicknameRequired();
    }
  });
}

function getLocalIP() {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    pc.createOffer().then((o) => pc.setLocalDescription(o));
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      const ip = candidate.candidate.match(/\b(\d{1,3}\.){3}\d{1,3}\b/)?.[0];
      if (ip && !ip.startsWith('169.254')) {
        pc.close();
        resolve(ip);
      }
    };
    setTimeout(() => resolve(null), 2000);
  });
}

function loadNickname() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || '');
    });
  });
}

function saveNickname(name) {
  chrome.storage.local.set({ [STORAGE_KEY]: name });
}

// ── UI ───────────────────────────────────────────────────────
function buildUI() {
  panel = document.createElement('div');
  panel.id = 'agongland-panel';
  panel.innerHTML = `
    <div id="agl-header">
      <button id="agl-toggle" title="패널 숨기기">▶</button>
      <span id="agl-title">아공랜드</span>
      <span id="agl-count">0명</span>
    </div>
    <div id="agl-tabs">
      <button class="agl-tab agl-tab-active" data-tab="rec">노래추천</button>
      <button class="agl-tab" data-tab="songs">노래목록</button>
    </div>
    <div id="agl-panel-rec" class="agl-tab-panel">
      <div class="agl-panel-hd"><span id="agl-rec-label">노래추천 (0)</span></div>
      <div id="agl-rec-list"></div>
      <div id="agl-rec-add">
        <input id="agl-rec-title-input" type="text" placeholder="노래 제목..." maxlength="100" />
        <div id="agl-rec-add-row">
          <input id="agl-rec-to-input" type="text" placeholder="추천받는 사람 (선택)" maxlength="12" />
          <button id="agl-rec-add-btn">추가</button>
        </div>
      </div>
    </div>
    <div id="agl-panel-songs" class="agl-tab-panel" style="display:none">
      <div class="agl-panel-hd"><span id="agl-songs-label">노래목록 (0)</span></div>
      <div id="agl-songs-list"></div>
      <div id="agl-songs-add">
        <div id="agl-song-add-main">
          <input id="agl-song-input" type="text" placeholder="노래 제목 입력..." maxlength="100" />
          <button id="agl-song-add-btn">추가</button>
        </div>
        <div id="agl-song-singers">
          <div id="agl-singers-count-row">
            <span id="agl-singers-label">같이 부르기</span>
            <div id="agl-singers-stepper">
              <button class="agl-singers-step-btn" id="agl-singers-minus" disabled>−</button>
              <span id="agl-singers-count">1</span>명
              <button class="agl-singers-step-btn" id="agl-singers-plus">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="agl-messages"></div>
    <div id="agl-nick-row">
      <input id="agl-nick-input" type="text" placeholder="닉네임" maxlength="12" />
      <button id="agl-nick-btn">변경</button>
    </div>
    <div id="agl-input-row">
      <input id="agl-chat-input" type="text" placeholder="메시지 입력..." maxlength="300" disabled />
      <button id="agl-send-btn" disabled>전송</button>
    </div>
    <div id="agl-qr">
      <div id="agl-qr-header">
        <span>QR로 접속</span>
        <button id="agl-qr-toggle">▼</button>
      </div>
      <div id="agl-qr-body" style="display:none">
        <img id="agl-qr-img" alt="QR Code" />
        <span id="agl-qr-url"></span>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById('agl-nick-input').value = nickname;
  document.getElementById('agl-toggle').addEventListener('click', togglePanel);
  document.getElementById('agl-qr-toggle').addEventListener('click', toggleQR);

  document.querySelectorAll('.agl-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('agl-rec-add-btn').addEventListener('click', addRecommendation);
  document.getElementById('agl-rec-title-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) addRecommendation();
  });

  document.getElementById('agl-song-add-btn').addEventListener('click', addSong);
  document.getElementById('agl-song-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) addSong();
  });
  document.getElementById('agl-singers-minus').addEventListener('click', () => {
    if (singerCount > 1) { singerCount--; updateSingerInputs(); }
  });
  document.getElementById('agl-singers-plus').addEventListener('click', () => {
    if (singerCount < 8) { singerCount++; updateSingerInputs(); }
  });
  document.getElementById('agl-nick-btn').addEventListener('click', changeNickname);
  document.getElementById('agl-nick-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') changeNickname();
  });
  document.getElementById('agl-send-btn').addEventListener('click', sendChat);
  document.getElementById('agl-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) sendChat();
  });
}

let collapsed = false;
let singerCount = 1;

function switchTab(tab) {
  document.querySelectorAll('.agl-tab').forEach(b => b.classList.toggle('agl-tab-active', b.dataset.tab === tab));
  document.getElementById('agl-panel-rec').style.display = tab === 'rec' ? 'block' : 'none';
  document.getElementById('agl-panel-songs').style.display = tab === 'songs' ? 'block' : 'none';
}

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

function updateSingerInputs() {
  const countEl = document.getElementById('agl-singers-count');
  const minusBtn = document.getElementById('agl-singers-minus');
  const plusBtn = document.getElementById('agl-singers-plus');
  if (!countEl) return;
  countEl.textContent = singerCount;
  if (minusBtn) minusBtn.disabled = singerCount <= 1;
  if (plusBtn) plusBtn.disabled = singerCount >= 8;
}

function toggleSongs() {
  songsCollapsed = !songsCollapsed;
  document.getElementById('agl-songs-body').style.display = songsCollapsed ? 'none' : 'block';
  document.getElementById('agl-songs-toggle').textContent = songsCollapsed ? '▼' : '▲';
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
      port?.postMessage({ type: 'song:list:request' }); // 서버에 재요청 대신 마지막 목록 재렌더
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

let qrVisible = false;
function toggleQR() {
  qrVisible = !qrVisible;
  document.getElementById('agl-qr-body').style.display = qrVisible ? 'block' : 'none';
  document.getElementById('agl-qr-toggle').textContent = qrVisible ? '▲' : '▼';
  if (qrVisible) {
    const img = document.getElementById('agl-qr-img');
    const urlEl = document.getElementById('agl-qr-url');
    const host = cachedIP || 'localhost';
    const url = `http://${host}:8080`;
    if (img && !img.getAttribute('src')) {
      img.src = `${url}/qr`;
    }
    if (urlEl) urlEl.textContent = url;
  }
}

function showNicknameRequired() {
  const nickInput = document.getElementById('agl-nick-input');
  const nickRow = document.getElementById('agl-nick-row');
  if (nickRow) nickRow.classList.add('agl-nick-required');
  if (nickInput) nickInput.focus();
  appendMessage({ type: 'system', text: '닉네임을 설정하면 채팅이 시작됩니다.' });
}

function togglePanel() {
  collapsed = !collapsed;
  panel.classList.toggle('agl-collapsed', collapsed);
  document.getElementById('agl-toggle').textContent = collapsed ? '◀' : '▶';
}

function setConnected(ok) {
  const input = document.getElementById('agl-chat-input');
  const btn = document.getElementById('agl-send-btn');
  if (input) input.disabled = !ok;
  if (btn) btn.disabled = !ok;
}

function updateCount(count) {
  const el = document.getElementById('agl-count');
  if (el) el.textContent = `${count}명`;
}

function appendMessage({ type, nickname: nick, text, time, count }) {
  const box = document.getElementById('agl-messages');
  if (!box) return;

  const row = document.createElement('div');

  if (type === 'system') {
    row.className = 'agl-msg agl-system';
    row.textContent = text;
    if (count !== undefined) updateCount(count);
  } else {
    row.className = 'agl-msg';
    row.innerHTML = `
      <span class="agl-nick">${nick}</span>
      <span class="agl-text">${text}</span>
      <span class="agl-time">${time}</span>
    `;
  }

  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  while (box.children.length > 200) box.removeChild(box.firstChild);
}

// ── Background 연결 ───────────────────────────────────────────
let cachedIP = null;

function connectToBackground() {
  try {
    port = chrome.runtime.connect({ name: 'agongland' });

    port.postMessage({ type: 'join', nickname, serverIP: cachedIP });

    port.onMessage.addListener((msg) => {
      if (msg.type === 'joined') {
        nickname = msg.nickname;
        saveNickname(nickname);
        const input = document.getElementById('agl-nick-input');
        if (input) input.value = nickname;
        updateCount(msg.count);
        setConnected(true);
      } else if (msg.type === 'song:list') {
        renderSongs(msg.songs);
      } else if (msg.type === 'rec:list') {
        renderRecommendations(msg.recommendations);
      } else {
        appendMessage(msg);
      }
    });

    port.onDisconnect.addListener(() => {
      setConnected(false);
      if (!chrome.runtime?.id) return;
      setTimeout(connectToBackground, 3000);
    });
  } catch {
    // 익스텐션이 재로드된 경우 - 페이지 새로고침 필요
  }
}

function sendChat() {
  const input = document.getElementById('agl-chat-input');
  const text = input?.value.trim();
  if (!text || !port || !chrome.runtime?.id) return;
  port.postMessage({ type: 'chat', text });
  appendMessage({
    type: 'chat',
    nickname,
    text,
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  });
  input.value = '';
}

function changeNickname() {
  const input = document.getElementById('agl-nick-input');
  const name = input?.value.trim();
  if (!name) return;
  nickname = name;
  saveNickname(name);
  document.getElementById('agl-nick-row')?.classList.remove('agl-nick-required');
  if (!port) {
    connectToBackground();
  } else if (chrome.runtime?.id) {
    port.postMessage({ type: 'join', nickname });
  }
}

// ── 초기 로드 ─────────────────────────────────────────────────
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
