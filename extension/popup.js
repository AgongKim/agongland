document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('toggle-btn');
  const statusEl = document.getElementById('status');

  chrome.storage.local.get('panelEnabled', ({ panelEnabled }) => {
    updateUI(panelEnabled !== false);
  });

  btn.addEventListener('click', () => {
    chrome.storage.local.get('panelEnabled', ({ panelEnabled }) => {
      const next = !(panelEnabled !== false);
      chrome.storage.local.set({ panelEnabled: next });
      updateUI(next);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'agl-toggle-panel', enabled: next });
        }
      });
    });
  });

  function updateUI(enabled) {
    btn.textContent = enabled ? '채팅 끄기' : '채팅 켜기';
    btn.className = enabled ? 'on' : 'off';
    statusEl.textContent = `현재: ${enabled ? '켜짐' : '꺼짐'}`;
  }
});
