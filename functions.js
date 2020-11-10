const exec = require('child_process').exec;
var adb = require('adbkit')
var client = adb.createClient();
var commandExists = require('command-exists');



module.exports =
{
    getDevice,
    trackDevices,
    checkDeps,
    checkMount

    // ...
}



// Implementation ----------------------------------

async function getDevice(){
    console.log("getDevice()")
    let device
    let devices = await client.listDevices()
    if (devices.length === 0) {
        return false
    }
    console.log("getdevices:")
    console.log(devices)
    device = devices[0]["id"];
    return device;
}




/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
            }
            resolve(stdout? stdout : stderr);
        });
    });
}


function trackDevices(){
    console.log("trackDevices()")
    client.trackDevices()
        .then(function(tracker) {
            tracker.on('add', function(device) {
                win.webContents.send('get_device',`{"success":${device.id}`);
                console.log('Device %s was plugged in', `{"success":${device.id}`)
            })
            tracker.on('remove', function(device) {
                win.webContents.send('get_device',`{"success":false}`);
                console.log('Device %s was unplugged', `{"success":false}`)
            })
            tracker.on('end', function() {
                console.log('Tracking stopped')
            })
        })
        .catch(function(err) {
            console.error('Something went wrong:', err.stack)
        })
}

async function checkMount(){
    console.log("checkMount()")
    return false;
}

async function checkDeps(){
    console.log("checkDeps()")
    try {
        exists = await commandExists('adb');
    }
    catch (e) {
        returnError("ADB global installation not found.")
        return
    }
    try {
        exists = await commandExists('rclone');
    }
    catch (e) {
        returnError("RCLONE global installation not found.")
        return
    }
    return
}

function returnError(message){
    console.log("returnError()")
    global.win.loadURL(`file://${__dirname}/views/error.twig`)
    twig.view = {
        message: message,
    }
}