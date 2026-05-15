let panel = null;
let collapsed = false;
let qrVisible = false;

function buildUI() {
  panel = document.createElement('div');
  panel.id = 'agongland-panel';
  panel.innerHTML = `
    <div id="agl-header">
      <button id="agl-toggle" title="패널 숨기기">▶</button>
      <span id="agl-title">아공랜드 (바탕화면/dist/agongland-server.exe 실행)</span>
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
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  chrome.storage.local.get('panelEnabled', ({ panelEnabled }) => {
    if (panelEnabled === false) panel.style.display = 'none';
  });

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

function switchTab(tab) {
  document.querySelectorAll('.agl-tab').forEach(b => b.classList.toggle('agl-tab-active', b.dataset.tab === tab));
  document.getElementById('agl-panel-rec').style.display = tab === 'rec' ? 'block' : 'none';
  document.getElementById('agl-panel-songs').style.display = tab === 'songs' ? 'block' : 'none';
}

function togglePanel() {
  collapsed = !collapsed;
  panel.classList.toggle('agl-collapsed', collapsed);
  document.getElementById('agl-toggle').textContent = collapsed ? '◀' : '▶';
}

function toggleQR() {
  qrVisible = !qrVisible;
  document.getElementById('agl-qr-body').style.display = qrVisible ? 'block' : 'none';
  document.getElementById('agl-qr-toggle').textContent = qrVisible ? '▲' : '▼';
  if (qrVisible) {
    const img = document.getElementById('agl-qr-img');
    if (img && !img.getAttribute('src')) {
      chrome.runtime.sendMessage({ type: 'getQR' }, (res) => {
        if (res && res.dataUrl) img.src = res.dataUrl;
      });
    }
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'agl-toggle-panel' || !panel) return;
  panel.style.display = msg.enabled ? 'flex' : 'none';
});

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

function showNicknameRequired() {
  const nickInput = document.getElementById('agl-nick-input');
  const nickRow = document.getElementById('agl-nick-row');
  if (nickRow) nickRow.classList.add('agl-nick-required');
  if (nickInput) nickInput.focus();
  appendMessage({ type: 'system', text: '닉네임을 설정하면 채팅이 시작됩니다.' });
}

const AGL_MAX_FLY = 100;
const AGL_BURST_PARTICLES = 13;

function spawnFlyingEmoji(emoji) {
  let container = document.getElementById('agl-emoji-fly');
  if (!container) {
    container = document.createElement('div');
    container.id = 'agl-emoji-fly';
    document.body.appendChild(container);
  }
  const baseLeft = 60 + Math.random() * 300;
  const baseTopPct = 25 + Math.random() * 45;
  for (let i = 0; i < AGL_BURST_PARTICLES; i++) {
    if (container.childElementCount >= AGL_MAX_FLY) {
      container.firstElementChild?.remove();
    }
    const el = document.createElement('span');
    el.className = 'agl-emoji-burst';
    el.textContent = emoji;
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.pow(Math.random(), 0.7) * 200;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 30;
    const rot = (Math.random() - 0.5) * 900;
    const delay = Math.random() * 80;
    const duration = 1100 + Math.random() * 600;
    const size = 22 + Math.random() * 16;
    el.style.left = baseLeft + 'px';
    el.style.top = baseTopPct + 'vh';
    el.style.fontSize = size + 'px';
    el.style.animationDelay = delay + 'ms';
    el.style.animationDuration = duration + 'ms';
    el.style.setProperty('--x', x + 'px');
    el.style.setProperty('--y', y + 'px');
    el.style.setProperty('--rot', rot + 'deg');
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}
