const exec = require('child_process').exec;
var adb = require('adbkit')
var client = adb.createClient();


module.exports =
{
    getDevice,
    execShellCommand,

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