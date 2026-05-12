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
