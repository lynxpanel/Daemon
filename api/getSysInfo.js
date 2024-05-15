const os = require('os-utils');

module.exports = {
    name: "SysInfo",
    method: "GET",
    path: "/api/information",
    callback: async (req, res, dir) => {
        let cpuUsage;
        os.cpuUsage(function (v) {
            cpuUsage = (v * 100).toFixed(2);
        });
        res.status(200)
            .json({"CPU": cpuUsage + '%', });
        console.log(cpuUsage)
    }
}