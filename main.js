const { app, BrowserWindow } = require('electron')
global.twig = require('electron-twig');
global.tmpdir = require('os').tmpdir()
global.tmpdir = global.tmpdir.replace(/\\/g,"/");
global.mountFolder = global.tmpdir+"/mnt";
global.platform = require('os').platform;
global.homedir = require('os').homedir();
global.endOfLine = require('os').EOL;
global.adbDevice = false
global.mounted = false
global.updateAvailable = false
global.installedApps = []
global.currentConfiguration = {}







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


// if (pkg.version !== latestVersion) {
//     await installPackageVersion(pkg.name, latestVersion)
//
//     console.log(`Upgraded from ${pkg.version} to ${latestVersion}. Restarting...`)
//
//     respawnProcess()
// }



app.disableHardwareAcceleration()

var tools = require("./tools")
const { ipcMain } = require('electron')


ipcMain.on('test', async (event, arg) => {

    //external link in browser
    //const { shell } = require('electron')
    //await shell.openExternal('https://electronjs.org')

    template = twig.

    event.reply('log', 'KK');
    return

    test = await tools.getPackageInfo(arg)
    event.reply('log', test);
    return

   test = await tools.getDirListing(global.mountFolder);
    test = test.join(global.endOfLine);
    event.reply('log', test);
    return
})

ipcMain.on('get_installed', async (event, arg) => {
    console.log("get_installed received");
    await tools.getInstalledApps();


    event.reply('get_installed', {"success": true, "apps": global.installedApps});
    return
})

ipcMain.on('get_storage', async (event, arg) => {
    console.log("get_storage received");
    res = await tools.getStorageInfo();

    event.reply('get_storage', res);
    return
})

ipcMain.on('get_installed_with_updates', async (event, arg) => {
    console.log("get_installed_with_updates received");
    await tools.getInstalledAppsWithUpdates();

    //console.log(apps)

    event.reply('get_installed', {"success": true, "apps": global.installedApps});
    return
})

ipcMain.on('get_device', async (event, arg) => {
    console.log("get_device received");
    resp = {success: global.adbDevice}
    event.reply('get_device', resp)

})

ipcMain.on('check_deps', async (event, arg) => {
    console.log("check_deps received");

    await tools.checkDeps()

    // IF DEPS OK LAUNCH CHECKDIVICES OTHERWISE NO
    tools.trackDevices()

    event.reply('check_deps', `{"success":true}`)
})

ipcMain.on('mount', async (event, arg) => {
    await tools.mount();
    await setTimeout(async function(){
        await tools.checkMount()
        event.reply('check_mount', `{"success":${global.mounted}, "mountFolder": "${global.mountFolder}"}`)
    }, 2000);

    return;
})

ipcMain.on('check_mount', async (event, arg) => {
    await tools.checkMount();
    event.reply('check_mount', `{"success":${global.mounted}, "mountFolder": "${global.mountFolder}"}`)
    return
})

ipcMain.on('start_sideload', async (event, arg) => {
    console.log("start_sideload received");
    if (!global.adbDevice) {
        console.log("Missing device, sending ask_device")
        //tools.returnError("This action cannot be performed without a device attached.")

        event.reply('ask_device', ``)
        return
    }
    event.reply('start_sideload', `{"success":true, "path": "${arg}"}`)
    tools.sideloadFolder(`${arg}`)
    event.reply('get_device', `{success:true}`)
    return
})


ipcMain.on('get_dir', async (event, arg) => {
    if ((typeof arg === 'string') && arg.endsWith(".apk")) {
        event.reply('ask_sideload', `{"success":true, "path": "${arg}"}`)
        return
    }

    //if only 1 apk inside, send straight to there

    if (!arg) {
        folder=global.homedir
    } else {
        folder=arg
    }
    list = await tools.getDir(folder)

    incList = []
    list.forEach((item)=>{
        if (!item.isFile) {
            incList.push(item)
        }
        if ((item.isFile && item.name.endsWith(".apk")) || (item.isFile && item.name.endsWith(".obb"))) {
            incList.push(item)
        }
    })



    response = {}
    response.success = true
    response.list = incList
    response.path = folder
    event.reply('get_dir', response)
})



ipcMain.on('update', async (event, arg) => {
    console.log("update received");

    let path = arg



    if (!global.adbDevice) {
        console.log("Missing device, sending ask_device")
        //tools.returnError("This action cannot be performed without a device attached.")

        event.reply('ask_device', ``)
        return
    }

    console.log("for path "+path)
    apkpath = await tools.getApkFromFolder(path);


    event.reply('ask_sideload', `{"success":true, "path": "${apkpath}"}`)

    return
})



ipcMain.on('uninstall', async (event, arg) => {
    console.log("uninstall received");
    resp = await tools.uninstall(arg);
    event.reply('uninstall', {"success":true})
    return
})

// ipcMain.on('change_config', async (event, arg) => {
//     console.log("change_config received");
//     await changeConfig('autoMount', true)
//     event.reply('change_config', {"success":true, config: global.currentConfiguration})
//     return
// })

ipcMain.on('change_config_autoMount', async (event, arg) => {
    console.log("change_config_autoMount received");
    await tools.changeConfig('autoMount', arg)
    event.reply('change_config_autoMount', {"success":true, config: global.currentConfiguration})
    return
})




function createWindow () {
    global.win = new BrowserWindow({
        width: 1000,
        height: 800,
        title:"Quest-Sidenoder",
        //frame:false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule:true,
        }
    })
    win.setMenu(null);

    win.webContents.openDevTools()

    win.maximize(true)
    win.loadURL(`file://${__dirname}/views/index.twig`)
    twig.view = {
        tmpdir: global.tmpdir,
        platform: global.platform,
        mountFolder: global.mountFolder,
        version: global.version,
        currentConfiguration: global.currentConfiguration
}


    //tools.checkUpdateAvailable()

    setTimeout(function(){ checkVersion(); }, 2000);
    //

}






try {
    tools.reloadConfig();
}
catch (e) {
    returnError("Could not (re)load config file.")
    return
}

// DEFAULT
app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
