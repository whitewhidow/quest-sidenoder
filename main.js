const { app, BrowserWindow } = require('electron')
global.twig = require('electron-twig');


var tools = require("./functions")

let device;


var adb = require('adbkit')
var client = adb.createClient();


// Point it to the current directory as a static server
//app.use(express.static('./static/'));
// Listen on port 3000 for any traffic



const { ipcMain } = require('electron')
ipcMain.on('get_device', async (event, arg) => {
    event.reply('get_device', `{"success":${await tools.getDevice()}}`)
})

ipcMain.on('check_mount', async (event, arg) => {
    event.reply('check_mount', `{"success":false}`)
})

ipcMain.on('check_deps', async (event, arg) => {
    var adbpath = await tools.execShellCommand('which adb')
    if (adbpath.length == 0) {
        returnError("ADB global installation not found.")
    } else {
        adbpath=adbpath.trim();
    }
    var rclonepath = await tools.execShellCommand('which rclone')
    if (rclonepath.length == 0) {
        tools.returnError("RCLONE global installation not found.")
    } else {
        rclonepath=rclonepath.trim();
    }
    event.reply('check_deps', `{"success":true, "adb": "${adbpath}", "rclone": "${rclonepath}"}`)
})



tools.trackDevices()






function createWindow () {
    global.win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadURL(`file://${__dirname}/views/index.twig`)
    twig.view = {
        test: 'fooooooooooooo',
    }
    //
    win.webContents.openDevTools()
}


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



function returnError(message){
    win.loadURL(`file://${__dirname}/views/error.twig`)
    twig.view = {
        message: message,
    }
}