const { app, BrowserWindow } = require('electron')
global.twig = require('electron-twig');


var tools = require("./functions")





// Point it to the current directory as a static server
//app.use(express.static('./static/'));
// Listen on port 3000 for any traffic



const { ipcMain } = require('electron')
ipcMain.on('get_device', async (event, arg) => {
    event.reply('get_device', `{"success":${await tools.getDevice()}}`)
})

ipcMain.on('check_mount', async (event, arg) => {
    event.reply('check_mount', `{"success":${await tools.checkMount()}}`)
})

ipcMain.on('check_deps', async (event, arg) => {
    await tools.checkDeps()

    // IF DEPS OK LAUNCH CHECKDIVICES OTHERWISE NO
    tools.trackDevices()

    event.reply('check_deps', `{"success":true}`)
})






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
