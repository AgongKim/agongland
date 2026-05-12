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

function sendChat() {
  const input = document.getElementById('agl-chat-input');
  const text = input?.value.trim();
  if (!text || !port || !chrome.runtime?.id) return;
  port.postMessage({ type: 'chat', text });
  appendMessage({
    type: 'chat',
    nickname,
    text,
    time: (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })(),
  });
  input.value = '';
}
