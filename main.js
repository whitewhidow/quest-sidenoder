const { app, BrowserWindow } = require('electron')
const twig = require('electron-twig');



var tools = require("./functions")

let device;


var adb = require('adbkit')
var client = adb.createClient();


// Point it to the current directory as a static server
//app.use(express.static('./static/'));
// Listen on port 3000 for any traffic

let win

const { ipcMain } = require('electron')
ipcMain.on('get_device', async (event, arg) => {
            //event.reply('get_device', device)

})
ipcMain.on('check_mount', async (event, arg) => {
    event.reply('check_mount', `{"success":true}`)
})



client.trackDevices()
    .then(function(tracker) {
        tracker.on('add', function(device) {
            win.webContents.send('get_device',device.id);
            console.log('Device %s was plugged in', device.id)
        })
        tracker.on('remove', function(device) {
            win.webContents.send('get_device',device.id);
            console.log('Device %s was unplugged', device.id)
        })
        tracker.on('end', function() {
            win.webContents.send('get_device',device.id);
            console.log('Tracking stopped')
        })
    })
    .catch(function(err) {
        console.error('Something went wrong:', err.stack)
    })






function createWindow () {
    global.sharedObj = {prop1: null};
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadURL(`file://${__dirname}/views/index.html.twig`)
    twig.view = {
        test: 'fooooooooooooo',
        device: global.device
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