module.exports = {
    name: "Ping",
    method: "GET",
    path: "/api/ping",
    callback: (req, res, dir) => {
        res.status(200).json({ status: 'SUCCESS', message: "Pong!"});
        console.log(`\x1b[0;34m[INFO]\x1b[0;30m user-agent: "${req.headers['user-agent']}" | x-real-ip: "${req.headers['x-real-ip']}"`);
        // Socket code has been removed since it was not provided and might not be relevant to this specific callback function
    },
};