const { generateKeyPairSync } = require('crypto');
const fs = require('fs');

module.exports = function FTPService() {
    const { privateKey, } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase: ''
        }
      });
      
      // Speichern des privaten Schlüssels in einer Datei
      fs.writeFileSync('host.key', privateKey);
      
      console.log('Schlüssel generiert und gespeichert.'); 
};
