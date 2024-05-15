const osu = require('node-os-utils');

module.exports = {
  name: "SysInfo",
  method: "GET",
  path: "/api/information",
  callback: async (req, res) => {
    try {
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
                "TotalMB": ramTotal.toFixed(0) + 'MB',
                "UsageMB": ramUsage.toFixed(0) + 'MB',
                "FreeMB": ramFree.toFixed(0) + 'MB',
            },
            "DRIVE": {
                "TotalGB": driveTotal + 'GB',
                "UsageGB": driveUsage + 'GB',
                "FreeGB": driveFree + 'GB',
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve system information' });
    }
  }
}