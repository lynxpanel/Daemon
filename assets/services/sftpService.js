const fs = require('fs');
const path = require('path');
const { Server } = require('ssh2');
const generateSFTPkey = require(path.resolve('./utils/generateSFTPkey'));

module.exports = async function SFTPService(ip, port, rootPath, certPath) {
    const resCertPath = path.join(__dirname, "../../", certPath);
    const privateKeyPath = path.join(resCertPath, 'id_rsa');
    const publicKeyPath = path.join(resCertPath, 'id_rsa.pub');

    await generateSFTPkey(privateKeyPath, publicKeyPath);

    const server = new Server({
        hostKeys: [fs.readFileSync(privateKeyPath, 'utf8')],
    }, (client) => {
        client.on('authentication', (ctx) => {
            console.log(ctx.method)
            if (!ctx.method === 'password' || ctx.method === 'none' && ctx.method === 'keyboard-interactive') ctx.reject();
            if (ctx.username !== 'Kenley' && ctx.password !== '1337') ctx.reject();
                ctx.accept();
        }).on('ready', () => {
            client.on('sftp', (accept) => {
                const sftpStream = accept();

                sftpStream.on('OPEN', (reqid, path, flags, attrs) => {
                    const fullPath = path.join(rootPath, path);
                    fs.open(fullPath, flags, (err, fd) => {
                        if (err) {
                            sftpStream.status(reqid, sftpStream.constructor.STATUS_CODE.NO_SUCH_FILE);
                        } else {
                            sftpStream.handle(reqid, Buffer.from([fd]));
                        }
                    });
                });
            });
        });
    });

    server.on('error', (err) => {
        console.error('SFTP server error:', err);
    });

    server.listen(port, ip, () => {
        console.log(`SFTP server listening on ${ip}:${port}`);
    });
};
