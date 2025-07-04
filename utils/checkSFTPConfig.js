const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const checkPort = require('./checkPort');
const FTPService = require('../assets/services/ftpService');
const SFTPService = require('../assets/services/sftpService');
let config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));

module.exports = async function checkSFTPConfig(){
        const protocol = config.sftp_protocol;
        const ip = config.sftp_ip;
        const port = config.sftp_port;
        const cert = config.sftp_pub_key;
        const volume_path = path.resolve(config.volume_path);

        if (protocol.toLowerCase() === 'disabled') return; // Check if SFTP/FTP disabled.
        
        checkPort(ip, port) // Check if port/ip is already in use.
            .then(isFree => {if (!isFree) return;})
            .catch(err => {
                console.error(`\x1b[0;31m[ERROR]\x1b[0;30m ${err.message}`);
        });
        
        if (protocol.toLowerCase() === 'ftp') return await FTPService(ip, port, volume_path); // Check if FTP Protocol.
        if (protocol.toLowerCase() === 'sftp') return await SFTPService(ip, port, volume_path, cert); // Check if SFTP Protocol.
};