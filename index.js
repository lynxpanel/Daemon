const express = require('express');
const bodyParser = require('body-parser');
const loadAPIS = require('./assets/utils/apiHandler');
const app = express();
const ip = '0.0.0.0';
const port = 8443;

try {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', '*');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });
    app.listen(port, ip, () => {
        console.log(`Daemon running on: ${ip}:${port}`);
        loadAPIS(app, __dirname);
    });
} catch (error) {
	console.warn(error);
};