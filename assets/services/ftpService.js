const FTPSrv = require('ftp-srv');
module.exports = async function FTPService(ip, port, path) {
    console.log('\x1b[0;34m[INFO]\x1b[0;30m Starting FTP Server.')
    const ftpServer = new FTPSrv({
        url: `ftp://${ip}:${port}`,
        anonymous: false,
        log: {
            warn: () => {},
            error: () => {},
            info: () => {},
            debug: () => {},
          },
    });

    ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
        if(username === 'Leon' && password === '1337'){
            return resolve({ root: path });    
        }
    });

    ftpServer.listen()
        .then(() => {
        console.log(`\x1b[0;32m[INFO]\x1b[0;30m FTP Server started on: ftp://${ip}:${port}`);
    });
};