const { app, BrowserWindow } = require('electron')
global.twig = require('electron-twig');

global.tmpdir = require('os').tmpdir()
global.mountFolder = require('path').join(tmpdir, 'mnt')
global.platform = require('os').platform;
global.homedir = require('os').homedir();

var path = require('path')
var fs = require('fs');


const fsPromise = fs.promises;

var tools = require("./functions")
const { ipcMain } = require('electron')



ipcMain.on('get_device', async (event, arg) => {
    device = await tools.getDevice()
    if (device) {
        event.reply('get_device', `{"success":"${await tools.getDevice()}"}`)
    } else {
        event.reply('get_device', `{"success":false}`)
    }
})

ipcMain.on('check_deps', async (event, arg) => {
    await tools.checkDeps()

    // IF DEPS OK LAUNCH CHECKDIVICES OTHERWISE NO
    tools.trackDevices()

    event.reply('check_deps', `{"success":true}`)
})

ipcMain.on('mount', async (event, arg) => {
    await tools.mount()
    setTimeout(async function(){ event.reply('check_mount', `{"success":${await tools.checkMount()}}`) }, 2000);


})

ipcMain.on('check_mount', async (event, arg) => {
    checkmount = await tools.checkMount();
    event.reply('check_mount', `{"success":${await tools.checkMount()}}`)
})


ipcMain.on('get_dir', async (event, arg) => {
    if ((typeof arg === 'string') && arg.endsWith(".apk")) {
        event.reply('start_sideload', `{"success":false}`)
    }
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



function createWindow () {
    global.win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    })
    win.setMenu(null);
    win.webContents.openDevTools()

    win.loadURL(`file://${__dirname}/views/index.twig`)
    twig.view = {
        tmpdir: global.tmpdir,
        platform: global.platform,
        mountFolder: global.mountFolder
        //adbpath: adbpath,
        //rclonepath: rclonepath
    }
    //

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
