const os = require('os');

const PRIVATE_RANGES = [
  /^127\./,
  /^::1$/,
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::ffff:(127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/,
];

function isPrivateIP(ip) {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return 'localhost';
}

module.exports = { isPrivateIP, getLocalIP };
