const pkg = require('./package.json');
global.version = pkg.version
async function checkVersion() {
    var fetch = require('node-fetch')
    var compareVersions = require('compare-versions');
    content = await fetch("https://api.github.com/repos/whitewhidow/quest-sidenoder/releases/latest")
    remoteversion = JSON.parse(await content.text()).name;
    console.log("Current version: "+pkg.version);
    console.log("Github version: "+remoteversion);
    if (compareVersions.compare(remoteversion, pkg.version, '=')) {
        console.log("Using latest version");
    } else {
        console.log("requires update");
        win.webContents.send('notify_update',{success:true, current: pkg.version, remote: remoteversion});
    }
}