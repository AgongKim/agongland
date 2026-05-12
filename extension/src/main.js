// chrome.runtime.connect()가 throw하는 이 오류는 try-catch로 잡히지 않는 Chrome 버그
window.addEventListener('error', (e) => {
  if (e.message?.includes('Extension context invalidated')) e.preventDefault();
});

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

if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
