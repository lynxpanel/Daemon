const path = require('path');
const { timingSafeEqual } = require('crypto');
const fs = require('fs');
const generateSFTPkey = require(path.resolve('./utils/generateSFTPkey'));
const { utils: { parseKey }, Server } = require('ssh2');
let directoryHandles = new Map();
let handles = new Map();

function checkValue(input, allowed) {
    const autoReject = (input.length !== allowed.length);
    if (autoReject) allowed = input;
    const isMatch = timingSafeEqual(input, allowed);
    return (!autoReject && isMatch);
}

module.exports = async function SFTPService(ip, port, rootPath, certPath) {
    console.log(`\x1b[0;34m[INFO]\x1b[0;30m SFTP Server starting on: ${ip}:${port}`);

    const resCertPath = path.join(__dirname, "../../", certPath);
    const privateKeyPath = path.join(resCertPath, 'private_sftp_key.pem');
    const publicKeyPath = path.join(resCertPath, 'public_sftp_key.pub');

    await generateSFTPkey(privateKeyPath, publicKeyPath);

    const allowedPubKey = parseKey(fs.readFileSync(privateKeyPath, 'utf8'));

    const server = new Server({
        hostKeys: [fs.readFileSync(privateKeyPath, 'utf8')],
        banner: 'Lynx-Panel Daemon'
    }, (client) => {
        client.on('authentication', (ctx) => {
            if (!ctx.username) return ctx.reject();

            switch (ctx.method) {
                // Password Authorization
                case 'password':
                    if (ctx.password === '1337' && ctx.username === 'Kenley') {
                        return ctx.accept();
                    } else {
                        return ctx.reject();
                    }
                case 'publickey':
                    // PublicKey Authorization
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
                    let openHandles = new Map();

                    sftp.on('REALPATH', async (reqid, reqPath) => {

                        // the REALPATH event gets triggered everytime the client opens an directory.

                        let fullPath = path.resolve(currentDir, reqPath); // resolves reqPath to currentDir.
                        if (!fullPath.startsWith(rootPath)) fullPath = rootPath; // checks if the fullPath includes the rootPath and if not sets fullPath to rootPath.
                        if (!fs.existsSync(fullPath)) return sftp.status(reqid, 4); // checks if the fullPath exists. if not returns an failure status to the client.
                        return sftp.name(reqid, [{ filename: fullPath }]); // if all checks above are successfully it returns the fullPath to the client.
                    });

                    sftp.on('OPENDIR', async (reqid, reqPath) => {
                        const fullPath = path.resolve(currentDir, reqPath);
                        // console.log(`\x1b[0;34m[INFO]\x1b[0;30m OPENDIR requested for: ${reqPath}, resolved to: ${fullPath}`); --debug

                        if (fullPath.startsWith(rootPath) && fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                            const handle = Buffer.from(fullPath);
                            // console.log(`\x1b[0;34m[INFO]\x1b[0;30m OPENDIR handle created for path: ${fullPath}`); --debug
                            sftp.handle(reqid, handle);
                            return openHandles.set(handle.toString(), reqid);
                        } else {
                            return sftp.status(reqid, 4);
                        }
                    });

                    sftp.on('READDIR', async (reqid, handle) => {
                        const dirPath = handle.toString();
                        // console.log(`\x1b[0;34m[INFO]\x1b[0;30m READDIR requested for handle: ${dirPath}`); --debug
                        if (dirPath.startsWith(rootPath) && fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                            if (!directoryHandles.has(dirPath)) {
                                const files = fs.readdirSync(dirPath);
                                const fileList = files.map(file => {
                                    const filePath = path.join(dirPath, file);
                                    const stats = fs.lstatSync(filePath);
                                    return {
                                        filename: file,
                                        longname: `${stats.isDirectory() ? 'drwxr-xr-x' : '-rw-r--r--'}   1 owner group      ${stats.size} ${stats.mtime.toUTCString()} ${file}`,
                                        attrs: {
                                            mode: stats.mode,
                                            size: stats.size,
                                            atime: stats.atime,
                                            mtime: stats.mtime
                                        }
                                    };
                                });
                                sftp.name(reqid, fileList);
                                directoryHandles.set(dirPath, false);
                            } else {
                                return sftp.status(reqid, 1);
                            }
                        } else {
                            return sftp.status(reqid, 4);
                        }
                    });

                    sftp.on('RENAME', async (reqid, oPath, nPath) => {
                        try {
                            const elements = oPath.replace(/\/$/, '').split('/');
                            if(path.resolve(oPath, elements[elements.length - 1])) return sftp.status(reqid, 3)
                            if(!oPath.startsWith(rootPath) || !nPath.startsWith(rootPath)) return sftp.status(reqid, 3);
                            fs.renameSync(oPath, nPath);
                            return sftp.status(reqid, 0);
                        } catch (err) {
                            console.log(err);
                            return sftp.status(reqid, 4);
                        };
                    });

                    sftp.on('REMOVE', async (reqid, reqFile) => {
                        try {
                            if(reqFile === rootPath) return sftp.status(reqid, 3);
                            if(!fs.existsSync(reqFile)) return sftp.status(reqid, 2);
                            fs.rmSync(reqFile);
                            return sftp.status(reqid, 0);
                        } catch (err) {
                            console.log(err);
                            return sftp.status(reqid, 4);
                        };
                    });

                    sftp.on('RMDIR', async (reqid, reqPath) => {
                        try {
                            if(reqPath === rootPath) return sftp.status(reqid, 3);
                            if(!fs.existsSync(reqPath)) return sftp.status(reqid, 10);
                            fs.rmdirSync(reqPath);
                            return sftp.status(reqid, 0);
                        } catch (err) {
                            console.log(err);
                            return sftp.status(reqid, 4);
                        };
                    });

                    sftp.on('MKDIR', async (reqid, reqPath, reqAttr) => {
                        try {
                            if(fs.existsSync(reqPath)) return sftp.status(reqid, 11);
                            fs.mkdirSync(reqPath, { recursive: true });
                            if(reqAttr.mode) fs.chmodSync(reqPath, reqAttr.mode);
                            if(reqAttr.uid && reqAttr.gid) fs.chownSync(reqPath, reqAttr.uid, reqAttr.gid);
                            if(reqAttr.atime && reqAttr.mtime) fs.utimesSync(reqPath, reqAttr.atime, reqAttr.mtime);
                            return sftp.status(reqid, 0);
                        } catch (err) {
                            console.log(err);
                            return sftp.status(reqid, 4);
                        };
                    });

                    sftp.on('STAT', async (reqid, reqPath) => {
                        try {
                            if(!fs.existsSync(reqPath)) return sftp.status(reqid, 10);
                            const attrs = fs.statSync(reqPath);
                            sftp.attrs(reqid, [{
                                mode: attrs.mode,
                                size: attrs.size,
                                uid: attrs.uid,
                                gid: attrs.gid,
                                atime: attrs.atime,
                                mtime: attrs.mtime
                            }]);
                        } catch (err) {
                            console.log(err);
                            return sftp.status(reqid, 4);
                        };
                    });

                    sftp.on('SETSTAT', async (reqid, reqPath, reqAttr) => {
                        try {
                            if(!fs.existsSync(reqPath)) return sftp.status(reqid, 10);
                            if(reqAttr.mode) fs.chmodSync(reqPath, reqAttr.mode);
                            if(reqAttr.uid && reqAttr.gid) fs.chownSync(reqPath, reqAttr.uid, reqAttr.gid);
                            if(reqAttr.atime && reqAttr.mtime) fs.utimesSync(reqPath, reqAttr.atime, reqAttr.mtime);
                            return sftp.status(reqid, 0);
                        } catch (err) {
                            console.log(err);
                            return sftp.status(reqid, 4);
                        };
                    });

                    sftp.on('OPEN', (reqid, filename, flags, attrs) => {
                        const mode = attrs.mode || 0o666;
                        const filePath = path.resolve('/var/lib/lynx-panel/volumes', filename); // Verzeichnis anpassen
                        const handle = Buffer.alloc(4);
                        handle.writeUInt32BE(Math.floor(Math.random() * 0xFFFFFFFF), 0);
              
                        // Ensure the file exists
                        fs.open(filePath, flags, mode, (err, fd) => {
                          if (err) {
                            if (err.code === 'ENOENT') {
                              fs.writeFileSync(filePath, '');
                              fs.open(filePath, flags, mode, (err, fd) => {
                                if (err) {
                                  console.error(err);
                                  return sftp.status(reqid, 4); // SSH_FX_FAILURE
                                }
                                handles.set(handle.toString('hex'), { fd, filePath });
                                sftp.handle(reqid, handle);
                              });
                            } else {
                              console.error(err);
                              return sftp.status(reqid, 4); // SSH_FX_FAILURE
                            }
                          } else {
                            handles.set(handle.toString('hex'), { fd, filePath });
                            sftp.handle(reqid, handle);
                          }
                        });
                      });
              
                    sftp.on('WRITE', (reqid, handle, offset, data) => {
                      const fileData = handles.get(handle.toString('hex'));
                      if (!fileData) {
                        return sftp.status(reqid, 4); // SSH_FX_FAILURE
                      }
              
                      fs.write(fileData.fd, data, 0, data.length, offset, (err, written) => {
                        if (err) {
                          console.error(err);
                          return sftp.status(reqid, 4); // SSH_FX_FAILURE
                        }
                        
                      sftp.status(reqid, 0); // SSH_FX_OK
                    });
                });
                sftp.on('READ', (reqid, handle, offset, length) => {
                    const fileData = handles.get(handle.toString('hex'));
                    if (!fileData) {
                      return sftp.status(reqid, 4); // SSH_FX_FAILURE
                    }
          
                    const buffer = Buffer.alloc(length);
                    fs.read(fileData.fd, buffer, 0, length, offset, (err, bytesRead) => {
                      if (err) {
                        console.error(err);
                        return sftp.status(reqid, 4); // SSH_FX_FAILURE
                      }
          
                      sftp.data(reqid, buffer.slice(0, bytesRead));
                    });
                  });

                    sftp.on('close', () => {
                        console.log('\x1b[0;32m[INFO]\x1b[0;30m SFTP session closed.');
                        directoryHandles.clear(); // Clear all handles after the session is closed
                    });
                });
            });
        });
    });

    server.on('error', (err) => {
        console.error('\x1b[0;31m[ERROR]\x1b[0;30m SFTP server error:', err);
    });

    server.listen(port, ip, () => {
        console.log(`\x1b[0;32m[INFO]\x1b[0;30m SFTP Server listening on: ${ip}:${port}`);
    });
};