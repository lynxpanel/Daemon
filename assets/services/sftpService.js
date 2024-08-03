const path = require('path');
const { timingSafeEqual } = require('crypto');
const { readFileSync, stat, statSync, existsSync } = require('fs');
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
                    console.log('\x1b[0;34m[ERROR]\x1b[0;30m  SFTP session started.');

                    let currentDir = rootPath;

                    sftp.on('pwd', (reqid) => {
                        sftp.name(reqid, [{
                            filename: path.basename(currentDir),
                            longname: `drwxr-xr-x   1 owner group      0 Aug  5 14:44 ${currentDir}`,
                            attrs: {
                                mode: statSync(currentDir).mode,
                                size: statSync(currentDir).size,
                                atime: new Date(),
                                mtime: new Date()
                            }
                        }]);
                    });

                    sftp.on('chdir', (reqid, reqPath) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        if (fullPath.startsWith(rootPath) && existsSync(fullPath) && statSync(fullPath).isDirectory()) {
                            currentDir = fullPath;
                            sftp.status(reqid, SFTP_STATUS_CODE.OK);
                        } else {
                            sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                        }
                    });

                    sftp.on('readdir', (reqid, reqPath) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        if (fullPath.startsWith(rootPath) && existsSync(fullPath) && statSync(fullPath).isDirectory()) {
                            fs.readdir(fullPath, (err, files) => {
                                if (err) {
                                    sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                                } else {
                                    const fileList = files.map(file => ({
                                        filename: file,
                                        longname: `drwxr-xr-x   1 owner group      0 Aug  5 14:44 ${file}`,
                                        attrs: {
                                            mode: statSync(path.join(fullPath, file)).mode,
                                            size: statSync(path.join(fullPath, file)).size,
                                            atime: new Date(),
                                            mtime: new Date()
                                        }
                                    }));
                                    sftp.name(reqid, fileList);
                                }
                            });
                        } else {
                            sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                        }
                    });

                    sftp.on('stat', (reqid, reqPath) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        if (fullPath.startsWith(rootPath) && existsSync(fullPath)) {
                            stat(fullPath, (err, stats) => {
                                if (err) {
                                    sftp.status(reqid, SFTP_STATUS_CODE.FAILURE);
                                } else {
                                    sftp.attrs(reqid, {
                                        mode: stats.mode,
                                        size: stats.size,
                                        atime: stats.atime,
                                        mtime: stats.mtime
                                    });
                                }
                            });
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