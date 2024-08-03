const FTPSrv = require('ftp-srv');
module.exports = function FTPService(ip, port, path) {
    const ftpServer = new FTPSrv({
        url: `ftp://${ip}:${port}`,
        anonymous: false
    });

    ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
        if(username === 'Leon' && password === '1337'){
            return resolve({ root:"/" });    
        }
    });

    ftpServer.listen()
        .then(() => {
        console.log('FTP server listening on port');
    });
};