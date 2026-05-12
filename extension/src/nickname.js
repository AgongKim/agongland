const STORAGE_KEY = 'agongland_nickname';

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
