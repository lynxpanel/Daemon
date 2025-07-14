const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('ssh2');

let directoryHandles = new Map();
let handles = new Map();
let currentDir;

const SFTP_OPEN_MODE = {
  READ: 0x00000001,
  WRITE: 0x00000002,
  APPEND: 0x00000004,
  CREAT: 0x00000008,
  TRUNC: 0x00000010,
  EXCL: 0x00000020,
};

function sftpFlagsToFsFlags(flags) {
  const { READ, WRITE, APPEND, CREAT, TRUNC, EXCL } = SFTP_OPEN_MODE;

  if ((flags & READ) && (flags & WRITE)) {
    if (flags & APPEND) return 'a+';
    if (flags & TRUNC) return 'w+';
    return 'r+';
  }
  if (flags & WRITE) {
    if (flags & APPEND) return 'a';
    if (flags & TRUNC) return 'w';
    return 'w';
  }
  if (flags & READ) {
    return 'r';
  }
  return 'r';
}

module.exports = async function SFTPService(ip, port, rootPath, certPath) {
    console.log('\x1b[0;34m[INFO]\x1b[0;30m Starting SFTP Server.');
    
    const keyPath = path.resolve(certPath);

    // Generate key if missing
    if (!fs.existsSync(path.join(keyPath, 'host_rsa_key.pem'))) {
        const { privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
        });
        fs.mkdirSync(keyPath, { recursive: true });
        fs.writeFileSync(path.join(keyPath, 'host_rsa_key.pem'), privateKey);
    }

    const server = new Server({
        hostKeys: [fs.readFileSync(path.join(keyPath, 'host_rsa_key.pem'))],
        banner: 'Lynx-Panel Daemon'
    }, (client) => {

        client.on('authentication', (ctx) => {
            if (ctx.method === 'password' && ctx.username === 'Kenley' && ctx.password === '1337') {
                return ctx.accept();
            }

            const auth = ['password'];
            return ctx.reject(auth, true);
        });

        client.on('ready', () => {
            client.on('session', (accept) => {
                const session = accept();

                session.on('sftp', (accept) => {
                    const sftp = accept();
                    
                    // === REALPATH ===
                    sftp.on('REALPATH', (reqid, reqPath) => {
                        if (!currentDir) currentDir = path.resolve(rootPath);

                        let fullPath = path.resolve(currentDir, reqPath);

                        if (!fullPath.startsWith(rootPath)) {
                            const stats = fs.statSync(rootPath);
                            const nameEntry = {
                                filename: rootPath,
                                longname: `${stats.isDirectory() ? 'd' : '-'}rwxr-xr-x    1 user group ${stats.size} ${stats.mtime.toUTCString()} ${path.basename(fullPath)}`,
                                attrs: {
                                mode: stats.mode,
                                uid: stats.uid || 0,
                                gid: stats.gid || 0,
                                size: stats.size,
                                atime: Math.floor(stats.atimeMs / 1000),
                                mtime: Math.floor(stats.mtimeMs / 1000)
                                }
                            };

                            return sftp.name(reqid, [nameEntry]);
                        }

                        if (!fs.existsSync(fullPath)) {
                            return sftp.status(reqid, 2);
                        }

                        const stats = fs.statSync(fullPath);

                        const nameEntry = {
                            filename: fullPath,
                            longname: `${stats.isDirectory() ? 'd' : '-'}rwxr-xr-x    1 user group ${stats.size} ${stats.mtime.toUTCString()} ${path.basename(fullPath)}`,
                            attrs: {
                            mode: stats.mode,
                            uid: stats.uid || 0,
                            gid: stats.gid || 0,
                            size: stats.size,
                            atime: Math.floor(stats.atimeMs / 1000),
                            mtime: Math.floor(stats.mtimeMs / 1000)
                            }
                        };

                        return sftp.name(reqid, [nameEntry]);
                    });

                    // === OPENDIR ===
                    sftp.on('OPENDIR', (reqid, reqPath) => {
                        if (!currentDir) currentDir = path.resolve(rootPath);
                        const fullPath = path.resolve(currentDir, reqPath);

                        if (
                            fullPath.startsWith(rootPath) &&
                            fs.existsSync(fullPath) &&
                            fs.statSync(fullPath).isDirectory()
                        ) {
                            try {
                                let files = fs.readdirSync(fullPath);

                                if (files.length === 0) {
                                    fs.writeFileSync(path.join(fullPath, '.empty'), '');
                                    files = fs.readdirSync(fullPath);
                                }

                                const otherFiles = files.filter(f => f !== '.empty');

                                if (files.includes('.empty') && otherFiles.length > 0) 
                                    fs.rmSync(path.join(fullPath, '.empty'));

                                const handle = crypto.randomBytes(16);

                                directoryHandles.set(handle.toString('hex'), {
                                    path: fullPath,
                                    files: files,
                                    position: 0
                                });

                                sftp.handle(reqid, handle);
                                } catch (err) {
                                    console.error('OPENDIR error:', err);
                                    return sftp.status(reqid, 4);
                                }
                        } else {
                            return sftp.status(reqid, 4);
                        }
                    });

                    // === READDIR ===
                    sftp.on('READDIR', (reqid, handle) => {
                        const hex = handle.toString('hex');
                        const dirHandle = directoryHandles.get(hex);

                        if (!dirHandle) {
                            return sftp.status(reqid, 4);
                        }

                        const { files, position, path: dirPath } = dirHandle;

                        if (position >= files.length) {
                            directoryHandles.delete(hex);
                            return sftp.status(reqid, 1);
                        }

                        const chunkSize = 10;
                        const chunk = files.slice(position, position + chunkSize);

                        const list = [];

                        for (const file of chunk) {
                            try {
                                const filePath = path.join(dirPath, file);

                                if (!fs.readdirSync(dirPath).includes(file)) continue;

                                const stats = fs.lstatSync(filePath);

                                list.push({
                                    filename: file,
                                    longname: `${stats.isDirectory() ? 'drwxr-xr-x' : '-rw-r--r--'}   1 owner group ${stats.size} ${stats.mtime.toUTCString()} ${file}`,
                                    attrs: {
                                    mode: stats.mode,
                                    size: stats.size,
                                    atime: Math.floor(stats.atimeMs / 1000),
                                    mtime: Math.floor(stats.mtimeMs / 1000)
                                }
                            });
                            } catch (err) {
                                console.error('READDIR error:', err);
                                return sftp.status(reqid, 4);
                            }
                        }

                        dirHandle.position += chunk.length;
                        currentDir = dirPath;
                        return sftp.name(reqid, list);
                    });

                    // === REMOVE ===
                    sftp.on('REMOVE', (reqid, reqFile) => {
                        const fullPath = path.resolve(rootPath, reqFile);
                        if (!fullPath.startsWith(rootPath) || !fs.existsSync(fullPath)) {
                            return sftp.status(reqid, 4);
                        }
                        fs.rmSync(fullPath);
                        sftp.status(reqid, 0);
                    });

                    // === RMDIR ===
                    sftp.on('RMDIR', (reqid, reqPath) => {
                        const fullPath = path.resolve(rootPath, reqPath);
                        if (!fullPath.startsWith(rootPath) || !fs.existsSync(fullPath)) {
                            return sftp.status(reqid, 4);
                        }
                        fs.rmdirSync(fullPath);
                        sftp.status(reqid, 0);
                    });

                    // === MKDIR ===
                    sftp.on('MKDIR', (reqid, reqPath, reqAttr) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        if (fs.existsSync(fullPath)) return sftp.status(reqid, 11);
                        fs.mkdirSync(fullPath, { recursive: true });
                        if (reqAttr.mode) fs.chmodSync(fullPath, reqAttr.mode);
                        sftp.status(reqid, 0);
                    });

                    // === RENAME ===
                    sftp.on('RENAME', (reqid, oPath, nPath) => {
                        const oldPath = path.resolve(currentDir, path.basename(oPath));
                        const newPath = path.resolve(currentDir, path.basename(nPath));
                        if (!oldPath.startsWith(rootPath) || !newPath.startsWith(rootPath)) {
                            return sftp.status(reqid, 3);
                        }
                        try {
                            fs.renameSync(oldPath, newPath);
                            sftp.status(reqid, 0);
                        } catch (err) {
                            console.log(err)
                            sftp.status(reqid, 4);
                        }
                    });

                    // === STAT ===
                    sftp.on('STAT', (reqid, reqPath) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        if (!fs.existsSync(fullPath)) return sftp.status(reqid, 10);
                        const stats = fs.statSync(fullPath);
                        sftp.attrs(reqid, {
                            mode: stats.mode,
                            size: stats.size,
                            uid: stats.uid,
                            gid: stats.gid,
                            atime: stats.atime,
                            mtime: stats.mtime
                        });
                    });

                    // === SETSTAT ===
                    sftp.on('SETSTAT', (reqid, reqPath, reqAttr) => {
                        const fullPath = path.resolve(currentDir, path.basename(reqPath));
                        if (!fs.existsSync(fullPath)) return sftp.status(reqid, 4);
                        try {
                            if (reqAttr.mode) fs.chmodSync(fullPath, reqAttr.mode);
                            if (reqAttr.uid && reqAttr.gid) fs.chownSync(fullPath, reqAttr.uid, reqAttr.gid);
                            if (reqAttr.atime && reqAttr.mtime) fs.utimesSync(fullPath, reqAttr.atime, reqAttr.mtime);
                            sftp.status(reqid, 0);
                        } catch {
                            sftp.status(reqid, 4);
                        }
                    });

                    // === OPEN ===
                    sftp.on('OPEN', (reqid, filename, flags, attrs) => {
                        const fullPath = path.resolve(currentDir, path.basename(filename));
                        if (!fullPath.startsWith(rootPath)) return sftp.status(reqid, 4);

                        const dir = path.dirname(fullPath);
                        
                        try {
                            if (!fs.readdirSync(dir)) {
                                fs.mkdirSync(dir);
                            }
                        } catch (err) {
                            console.error('mkdir error:', err);
                            return sftp.status(reqid, 4);
                        }

                        const handle = Buffer.alloc(4);
                        handle.writeUInt32BE(Math.floor(Math.random() * 0xffffffff), 0);

                        const fsFlags = sftpFlagsToFsFlags(flags);

                        fs.open(fullPath, fsFlags, attrs.mode || 0o666, (err, fd) => {
                            if (err) {
                                console.error('fs.open error:', err);
                                return sftp.status(reqid, 4);
                            }

                            handles.set(handle.toString("Hex"), {
                                fd,
                                filePath: fullPath,
                                writeQueue: Promise.resolve()
                            });
                            sftp.handle(reqid, handle);
                        });
                    });

                    // === WRITE ===
                    sftp.on('WRITE', (reqid, handle, offset, data) => {
                        const hex = handle.toString('hex');
                        const h = handles.get(hex);

                        if (!h) {
                            return sftp.status(reqid, 4);
                        }

                        if (!h.writeQueue) h.writeQueue = Promise.resolve();

                        h.writeQueue = h.writeQueue.then(() => {
                            return new Promise((resolve) => {
                                fs.write(h.fd, data, 0, data.length, offset, (err, written) => {
                                    if (err) {
                                        console.log(err)
                                        sftp.status(reqid, 4);
                                        return resolve();
                                    }
                                    sftp.status(reqid, 0);
                                    resolve();
                                });
                            });
                        }).catch(err => {
                            console.error('WRITE queue error:', err);
                            sftp.status(reqid, 4);
                        });
                    });


                    // === READ ===
                    sftp.on('READ', (reqid, handle, offset, length) => {
                        const hex = handle.toString('hex');
                        const h = handles.get(hex);

                        if (!h) {
                            return sftp.status(reqid, 4);
                        }

                        const buffer = Buffer.alloc(length);

                        fs.read(h.fd, buffer, 0, length, offset, (err, bytesRead) => {
                            if (err) {
                                console.error('READ error:', err);
                                return sftp.status(reqid, 4); // SSH_FX_FAILURE
                            }

                            if (bytesRead === 0) {
                                return sftp.status(reqid, 1); // SSH_FX_EOF
                            }

                            sftp.data(reqid, buffer.slice(0, bytesRead));
                        });
                    });


                    // === CLOSE ===
                    sftp.on('CLOSE', (reqid, handle) => {
                        const hex = handle.toString('hex');
                        const h = handles.get(hex);

                        if (!h) {
                            return sftp.status(reqid, 4);
                        }

                        (h.writeQueue || Promise.resolve())
                            .then(() => {
                                fs.close(h.fd, (err) => {
                                    if (err) {
                                        sftp.status(reqid, 4);
                                    } else {
                                        handles.delete(hex);
                                        sftp.status(reqid, 0);
                                    }
                                });
                            })
                            .catch(err => {
                                console.error('Error while closing:', err);
                                sftp.status(reqid, 4);
                            });
                    });

                    // === ERROR ===
                    sftp.on('error', (err) => {
                        console.error('SFTP Error:', err);
                    });
                });
            });
        });
    });

    server.on('error', (err) => {
        console.error('SFTP server error:', err);
    });

    await server.listen(port, ip, () => {
        console.log(`\x1b[0;32m[INFO]\x1b[0;30m SFTP Server started on: sftp://${ip}:${port}`);
    });
};
