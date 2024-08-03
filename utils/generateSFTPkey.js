const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function generateSFTPkey(privateKeyPath, publicKeyPath, passphrase = '') {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(privateKeyPath)) return resolve();
        if (fs.existsSync(publicKeyPath)) return resolve();

        const dirPath = path.dirname(privateKeyPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const privateKey = crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem',
            }
        }).privateKey;

        const publicKey = crypto.createPublicKey(privateKey).export({
            type: 'spki',
            format: 'pem',
        });

        fs.writeFileSync(privateKeyPath, privateKey);
        fs.writeFileSync(publicKeyPath, publicKey);

        resolve();
    });
}

module.exports = generateSFTPkey;