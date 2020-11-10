const exec = require('child_process').exec;
var adb = require('adbkit')
var client = adb.createClient();


module.exports =
{
    getDevice,
    execShellCommand,
    trackDevices,
    returnError

    // ...
}



// Implementation ----------------------------------

async function getDevice(){
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
    console.log('Tracking started')
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
                //win.webContents.send('get_device',device.id);
                console.log('Tracking stopped')
            })
        })
        .catch(function(err) {
            console.error('Something went wrong:', err.stack)
        })
}


function returnError(message){
    global.win.loadURL(`file://${__dirname}/views/error.twig`)
    twig.view = {
        message: message,
    }
}