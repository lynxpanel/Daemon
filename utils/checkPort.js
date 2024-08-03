const net = require('net');

module.exports = function checkPort(ip, port, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
  
      socket.setTimeout(timeout);
      socket.once('error', err => {
        if (err.code === 'ECONNREFUSED') {
          resolve(true);
        } else {
          reject(err);
        }
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, ip, () => {
        socket.end();
        resolve(false);
      });
    });
  }