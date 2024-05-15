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

      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const maxMem = memUsage.heapUsed + memUsage.heapTotal;

      res.status(200).json({
        CPU: `${cpuUsage}%`,
        UsedMem: `${(usedMem /1024).toFixed(2)} GB`,

        Memory: {
          Total: `${(totalMem).toFixed(2)} MB`,
          Used: `${(usedMem).toFixed(2)} MB`,
          Free: `${(freeMem).toFixed(2)} MB`,
        }
      });
      console.log(`CPU usage: ${cpuUsage}%`);
      console.log(`Memory usage: ${usedMem} MB / ${totalMem} MB`);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve system information' });
    }
  }
}