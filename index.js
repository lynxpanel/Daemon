// DO NOT TOUCH
global.D_VERSION = "1.0.0";

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const express = require('express');
const bodyParser = require('body-parser');
const loadAPIS = require('./utils/apiHandler');
const checkSFTPConfig = require('./utils/checkSFTPConfig');
const checkDatabaseConfig = require('./utils/checkDatabaseConfig');
let config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));
const app = express();

app.use((req, res, next) => {
    let config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const cleanedIP = clientIP.split(',')[0].trim();
    
    if (config.allowed_ips.includes(cleanedIP) || config.allowed_ips[0] === '*') {
        next();
    } else {
        res.status(403).send('IP Not Allowed');
    }
});

// Middleware for CORS
app.use((req, res, next) => {
    let config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));
    if (config.allowed_ips[0] === '*') {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(config.port, config.ip, async () => {
    if (!(process.getuid ? process.getuid() === 0 : false)) {
        console.log(`\x1b[0;31m[ERROR]\x1b[0;30m Cannot continue. Error_Code: Service is not running with root privileges`);
        process.exit(1);
    }
        
    await checkDatabaseConfig();
    await checkSFTPConfig();
    console.log(`\x1b[0;32m[INFO]\x1b[0;30m Daemon running on: ${config.ip}:${config.port}`);
    loadAPIS(app, __dirname);
});