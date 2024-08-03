const { Server } = require('ssh2');
const fs = require('fs');

const privateKey = fs.readFileSync('host.key');

module.export = function sshService(ctx, ){
    const server = new Server({
        hostKeys: [privateKey]
    }, (client) => {
        console.log('Client connected!');
    })
    
    client.on('authentication', (ctx) => {
        if (ctx.method === 'password' && ctx.username === 'user' && ctx.password === 'pass') {
          ctx.accept();
        } else {
          ctx.reject();
        }
      }).on('ready', () => {
        console.log('Client authenticated!');
    
        client.on('session', (accept) => {
          const session = accept();
          session.on('exec', (accept, reject, info) => {
            console.log('Client wants to execute: ' + info.command);
            const stream = accept();
            stream.write('Hello from SSH server!\n');
            stream.exit(0);
            stream.end();
          });
        });
      }).on('end', () => {
        console.log('Client disconnected');
      });
};