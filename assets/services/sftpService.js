const path = require('path');
const { timingSafeEqual } = require('crypto');
const { readFileSync, stat, statSync, existsSync, readdir } = require('fs');
const generateSFTPkey = require(path.resolve('./utils/generateSFTPkey'));
const { utils: { parseKey }, Server, SFTP_STATUS_CODE } = require('ssh2');

function checkValue(input, allowed) {
  const autoReject = (input.length !== allowed.length);
  if (autoReject) allowed = input;
  const isMatch = timingSafeEqual(input, allowed);
  return (!autoReject && isMatch);
}

module.exports = async function SFTPService(ip, port, rootPath, certPath) {
    const resCertPath = path.join(__dirname, "../../", certPath);
    const privateKeyPath = path.join(resCertPath, 'private_sftp_key.pem');
    const publicKeyPath = path.join(resCertPath, 'public_sftp_key.pub');

    await generateSFTPkey(privateKeyPath, publicKeyPath);

    const allowedPubKey = parseKey(readFileSync(privateKeyPath, 'utf8'));

    const server = new Server({
        hostKeys: [readFileSync(privateKeyPath, 'utf8')],
    }, (client) => {
        client.on('authentication', (ctx) => {
            if (!ctx.username) return ctx.reject();

            switch (ctx.method) {
                case 'password':
                    if (ctx.password === '1337' && ctx.username === 'Kenley') {
                        return ctx.accept();
                    } else {
                        return ctx.reject();
                    }
                case 'publickey':
                    if (ctx.key.algo !== allowedPubKey.type
                        || !checkValue(ctx.key.data, allowedPubKey.getPublicSSH())
                        || (ctx.signature && allowedPubKey.verify(ctx.blob, ctx.signature, ctx.hashAlgo) !== true)) {
                        return ctx.reject();
                    } else {
                        return ctx.accept();
                    }
            }

            const auth = ["password", "publickey"];
            return ctx.reject(auth, true);
        }).on('ready', () => {
            client.on('session', (accept, reject) => {
                const session = accept();
                session.on('sftp', (accept, reject) => {
                    console.log('\x1b[0;34m[INFO]\x1b[0;30m SFTP session started.');
                    const sftp = accept();
                    let currentDir = rootPath;

                    // Handler für `pwd` (Print Working Directory)
                    sftp.on('REALPATH', (reqid, reqPath) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        if (fullPath.startsWith(rootPath) && existsSync(fullPath)) {
                            sftp.name(reqid, [{
                                filename: path.basename(fullPath),
                                longname: `drwxr-xr-x   1 owner group      0 ${new Date().toUTCString()} ${fullPath}`,
                                attrs: {
                                    mode: statSync(fullPath).mode,
                                    size: statSync(fullPath).size,
                                    atime: new Date(),
                                    mtime: new Date()
                                }
                            }]);
                        } else {
                            sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                        }
                    });

                    // Handler für `readdir` (Read Directory)
                    sftp.on('READDIR', (reqid, reqPath) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        if (fullPath.startsWith(rootPath) && existsSync(fullPath) && statSync(fullPath).isDirectory()) {
                            try {
                                const files = readdirSync(fullPath);
                                const fileList = files.map(file => {
                                    const filePath = path.join(fullPath, file);
                                    return {
                                        filename: file,
                                        longname: `drwxr-xr-x   1 owner group      0 ${new Date().toUTCString()} ${file}`,
                                        attrs: {
                                            mode: statSync(filePath).mode,
                                            size: statSync(filePath).size,
                                            atime: new Date(),
                                            mtime: new Date()
                                        }
                                    };
                                });
                                sftp.name(reqid, fileList);
                            } catch (err) {
                                sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                            }
                        } else {
                            sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                        }
                    });

                    // Handler für `stat` (Stat File)
                    sftp.on('STAT', (reqid, reqPath) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        if (fullPath.startsWith(rootPath) && existsSync(fullPath)) {
                            try {
                                const stats = statSync(fullPath);
                                sftp.attrs(reqid, {
                                    mode: stats.mode,
                                    size: stats.size,
                                    atime: stats.atime,
                                    mtime: stats.mtime
                                });
                            } catch (err) {
                                sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                            }
                        } else {
                            sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                        }
                    });
                    

                    // Implementiere hier weitere Events wie `mkdir`, `rmdir`, `unlink`, `open`, `read`, `write`, etc.

                    sftp.on('close', () => {
                        console.log('\x1b[0;32m[INFO]\x1b[0;30m SFTP session closed.');
                    });
                });
            });
        });
    });

    // Fehlerbehandlung für den Server
    server.on('error', (err) => {
        console.error('\x1b[0;31m[ERROR]\x1b[0;30m SFTP server error:', err);
    });

    // Server starten
    server.listen(port, ip, () => {
        console.log(`\x1b[0;32m[INFO]\x1b[0;30m SFTP Server listening on: ${ip}:${port}.`);
    });
};