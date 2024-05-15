const fs = require('fs');
const path = require('path');

function ifFile(app, dir){
    let mod = require(dir);
    try {
        app[mod.method.toLowerCase()](mod.path, (req, res) => {
            mod.callback(req, res, __dirname);
        });
        console.log(`Loaded: ${mod.name} | ${mod.method} | ${mod.path}`);
    } catch (err) {
        console.log(err);
    }
}

function ifDir(app, dir){
    let files = fs.readdirSync(dir);
    if(files.length === 0){return;}else{
        for (let i = 0; i < files.length; i++) {
            let stats = fs.lstatSync(dir);
            if (stats.isDirectory()) {
                ifDir(app, path.join(dir, 'api', files[i]));
            } else {
                ifFile(app, path.join(dir, 'api', files[i]));
            }
        }
    }
}

module.exports = function loadAPIS(app, dir){
    let files = fs.readdirSync(path.join(dir, 'api'));
    for (let i = 0; i < files.length; i++) {
        let stats = fs.lstatSync(path.join(dir, 'api', files[i]));
        if(files.length === 0){return;}else{
            if (stats.isDirectory()) {
                ifDir(app, path.join(dir, 'api', files[i]));
            } else {
                ifFile(app, path.join(dir, 'api', files[i]))
            }
        }
    }
}