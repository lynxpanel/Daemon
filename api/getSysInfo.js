const os = require('os-utils');


module.exports = {
  name: "SysInfo",
  method: "GET",
  path: "/api/information",
  callback: async (req, res) => {
    try {
      const cpuUsage = await new Promise(resolve => {
        os.cpuUsage(v => {
          resolve((v * 100).toFixed(2));
        });
      });
      res.status(200).json({ CPU: `${cpuUsage}%` });
      console.log(`CPU usage: ${cpuUsage}%`);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve system information' });
    }

  }

}