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
        // if(!req.body.token === config.api_token || !req.body.token) return res.status(403);
        let totalGb, usedGb, freeGb;

        const [
            cpuUsage,
            { usedMemMb },
            { freeMemMb },
        ] = await Promise.all([
            osu.cpu.usage(),
            osu.mem.used(),
            osu.mem.free(),
        ]);

        if (!osu.os.type().includes("Win")) {
            try {
                const [
                info,
                used,
                free
                ] = await Promise.all([
                osu.drive.info('/'),
                osu.drive.used('/'),
                osu.drive.free('/')
                ]);
                
                totalGb = info.totalGb.toFixed(1) + 'GB';
                usedGb = used.usedGb.toFixed(1) + 'GB';
                freeGb = free.freeGb.toFixed(1) + 'GB';
            } catch (err) {
                totalGb = usedGb = freeGb = 'Unavailable';
            }
        } else {
            totalGb = usedGb = freeGb = 'Unavailable';
        }

        res.status(200).json({
        "CPU": cpuUsage.toFixed(1) + "%",
        "RAM": {
            "Total": (osu.mem.totalMem() / 1024 / 1024).toFixed(0) + 'MB',
            "Used": usedMemMb.toFixed(0) + 'MB',
            "Free": freeMemMb.toFixed(0) + 'MB',
        },
        "DRIVE": {
            "Total": totalGb,
            "Used": usedGb,
            "Free": freeGb,
        },
        "OS": {
            "Name": osu.os.hostname(),
            "Platform": osu.os.platform(),
            "Type": osu.os.type(),
            "Uptime": formatTime(osu.os.uptime()),
            "IP": osu.os.ip(),
            
        },
        "DAEMON": {
            "Version": global.D_VERSION,
        }
        });

        console.log(`\x1b[0;34m[INFO]\x1b[0;30m user-agent: "${req.headers['user-agent']}" | x-real-ip: "${req.headers['x-real-ip']}" | token: "${req.body.token}"`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve system information' });
    }
  }
};

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours}h ${minutes}m ${secs.toFixed(0)}s`;
};