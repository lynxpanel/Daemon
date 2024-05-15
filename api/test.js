module.exports = {
    name: "ping",
    method: "GET",
    path: "/api/ping",
    callback: (req, res, dir) => {
        res.status(200).json({ status: 'SUCCESS', message: "Pong!" });
    },
};