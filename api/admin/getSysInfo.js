const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const osu = require('node-os-utils');
const config = yaml.load(fs.readFileSync(path.resolve('./config.yml'), 'utf8'));

module.exports = {
  name: "SysInfo",
  method: "POST",
  path: "/api/information",
  callback: async (req, res) => {
    try {
        if(!req.body.token === config.api_token || !req.body.token) return res.status(403);
        const cpuUsage = await new Promise(resolve => {osu.cpu.usage().then(v => {resolve(v);});});
        const ramTotal = osu.mem.totalMem() / 1024 / 1024;
        const ramUsage = await new Promise(resolve => {osu.mem.used().then(v => {resolve(v.usedMemMb);});});
        const ramFree = await new Promise(resolve => {osu.mem.free().then(v => {resolve(v.freeMemMb);});});
        const driveTotal = await new Promise(resolve => {osu.drive.info().then(v => {resolve(v.totalGb)})});
        const driveUsage = await new Promise(resolve => {osu.drive.used().then(v => {resolve(v.usedGb);});});
        const driveFree = await new Promise(resolve => {osu.drive.free().then(v => {resolve(v.freeGb);});});
        res.status(200).json({
            "CPU": cpuUsage + "%",
            "RAM": {
                "Total": ramTotal.toFixed(0) + 'MB',
                "Used": ramUsage.toFixed(0) + 'MB',
                "Free": ramFree.toFixed(0) + 'MB',
            },
            "DRIVE": {
                "Total": driveTotal + 'GB',
                "Used": driveUsage + 'GB',
                "Free": driveFree + 'GB',
            }
        });
        console.log(`\x1b[0;34m[INFO]\x1b[0;30m user-agent: "${req.headers['user-agent']}" | x-real-ip: "${req.headers['x-real-ip']}" | token: "${req.body.token}"`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve system information' });
    }
  }
}