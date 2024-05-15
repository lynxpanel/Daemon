const os = require('os-utils');

module.exports = {
  name: "SysInfo",
  method: "GET",
  path: "/api/information",
  callback: async (req, res) => {
    try {
      const cpuUsage = await new Promise(resolve => {os.cpuUsage(v => {resolve((v * 100).toFixed(2));});});
      const ramUsage = os.totalmem() - os.freemem();
      res.status(200).json({ "CPU": cpuUsage + "%", "RAM": ramUsage.toFixed(0) + 'MB' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve system information' });
    }
  }
}