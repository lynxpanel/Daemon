const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function generateSFTPkey(privateKeyPath, publicKeyPath, passphrase = '') {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) return resolve();
        console.log('\x1b[0;34m[INFO]\x1b[0;30m Generating SFTP Key-Pair.');
        if (fs.existsSync(privateKeyPath)) {fs.rmSync(privateKeyPath);};
        if (fs.existsSync(publicKeyPath)) {fs.rmSync(publicKeyPath);};

        const dirPath = path.dirname(privateKeyPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const { privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem',
            },
        });

        const publicKey = crypto.createPublicKey({
            key: privateKey,
            format: 'pem',
            type: 'pkcs1'
        }).export({
            type: 'spki',
            format: 'pem',
        });

        fs.writeFileSync(privateKeyPath, privateKey);
        fs.writeFileSync(publicKeyPath, publicKey);

        console.log('\x1b[0;32m[INFO]\x1b[0;30m Generated SFTP Key-Pair.');
        return resolve();
    });
}

module.exports = generateSFTPkey;
