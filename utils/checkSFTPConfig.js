const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const checkPort = require('./checkPort');
const FTPService = require('../assets/services/ftpService');
const SFTPService = require('../assets/services/sftpService');
let config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));

module.exports = function checkSFTPConfig(){
        const protocol = config.sftp_protocol;
        const ip = config.sftp_ip;
        const port = config.sftp_port;
        const cert = config.sftp_cert;

        const volume_path = config.volume_path;

        if (protocol.toLowerCase() === 'disabled') return; // Check if SFTP/FTP disabled.
        
        checkPort(ip, port) // Check if port/ip is already in use.
            .then(isFree => {if (!isFree) return;})
            .catch(err => {
                console.error(`Fehler beim Überprüfen des Ports: ${err.message}`);
        });
        
        if (protocol.toLowerCase() === 'ftp') return FTPService(ip, port, volume_path); // Check if FTP Protocol.
        if (protocol.toLowerCase() === 'sftp') return SFTPService(ip, port, volume_path, cert); // Check if SFTP Protocol.
};