const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const express = require('express');
const bodyParser = require('body-parser');
const loadAPIS = require('./utils/apiHandler');
let config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));
const app = express();

app.use((req, res, next) => {
    let config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const cleanedIP = clientIP.split(',')[0].trim();
    console.log(config.allowed_ips)
    
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

app.listen(config.port, config.ip, () => {
    console.log(`\x1b[0;32m[INFO]\x1b[0;30m Daemon running on: ${config.ip}:${config.port}`);
    loadAPIS(app, __dirname);
});