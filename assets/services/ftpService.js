const FTPSrv = require('ftp-srv');
module.exports = function FTPService(ip, port, path) {
    console.log('\x1b[0;34m[INFO]\x1b[0;0m Starting FTP Server.')
    const ftpServer = new FTPSrv({
        url: `ftp://${ip}:${port}`,
        anonymous: false,
        log: {
            info: () => {},
          },
    });

    ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
        if(username === 'Leon' && password === '1337'){
            return resolve({ root: path });    
        }
    });

    ftpServer.listen()
        .then(() => {
        console.log(`\x1b[0;32m[INFO]\x1b[0;0m FTP Server started on: ftp://${ip}:${port}`);
    });
};