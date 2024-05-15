const docker = require('dockerode')();

module.exports = {
  name: "CreateMinecraftContainer",
  method: "POST",
  path: "/api/minecraft/create",
  callback: async (req, res) => {
    try {
      const { name, memory, cpu } = req.body;

      if (!name || !memory || !cpu) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const container = await docker.createContainer({
        Image: "ghcr.io/pterodactyl/yolks:java_17",
        name,
        HostConfig: {
          Memory: memory * 1024 * 1024,
          CpuShares: cpu
        },
        Env: ["EULA=TRUE", "TYPE=VANILLA", "VERSION=1.19.2"],
        ExposedPorts: {
          "25565/tcp": {}
        },
        Hostname: name
      });

      await container.start();

      res.status(200).json({ message: "Minecraft container created successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create Minecraft container" });
    }
  }
};