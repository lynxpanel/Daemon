const { ftpd } = require('jsftpd');
module.exports = async function FTPService(ip, port, path) {
    console.log('\x1b[0;34m[INFO]\x1b[0;30m Starting FTP Server.');

    const server = new ftpd({cnf: {username: 'Leon', password: '1337', basefolder: path, port: port}});

    server.start();

    await server.on('listen', (data) => console.log(`\x1b[0;32m[INFO]\x1b[0;30m FTP Server started on: ftp://${ip}:${data.port}`));
};