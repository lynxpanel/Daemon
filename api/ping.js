const { os } = require("node-os-utils");

module.exports = {
    name: "ping",
    method: "GET",
    path: "/api/ping",
    callback: (req, res, dir) => {
        res.status(200).json({ status: 'SUCCESS', message: "Pong!"});

        // Socket code has been removed since it was not provided and might not be relevant to this specific callback function
    },
};