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
