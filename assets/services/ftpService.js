const FTPSrv = require('ftp-srv');
module.exports = function FTPService(ip, port, path){
    const ftpServer = new FTPSrv({
        url: `ftp://${ip}:${port}`,
        anonymous: false
    });

    ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
        if ((username === 'root' && password === 'rootpassword') ||
            (username === 'kenley' && password === 'kenleypassword')) {
            resolve({ root: userRoot });
        } else {
            reject(new Error('Invalid username or password'));
        }
    });

    ftpServer.listen(port, ip)
        .then(() => {
        console.log('FTP server listening on port 21');
    });
};