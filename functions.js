const exec = require('child_process').exec;
var adb = require('adbkit')
var client = adb.createClient();
const fs = require('fs');
const fsPromise = fs.promises;

var fetch = require('node-fetch')

var commandExists = require('command-exists');


const promise = require('promise')


module.exports =
{
    getDevice,
    trackDevices,
    checkDeps,
    checkMount,
    mount,
    getDir

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
                win.webContents.send('get_device',`{"success":"${device.id}"}`);
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
    try {
        await fsPromise.readdir(`${mountFolder}`);
        list = await getDir(`${mountFolder}`);
        if (list.length > 0) {
            return true
        }
        return false;
    }
    catch (e) {
        console.log("entering catch block");
        console.log(e);
        console.log("leaving catch block");
        return false
    }
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
    win.webContents.send('check_deps',`{"success":true}`);
    return
}

function returnError(message){
    console.log("returnError()")
    global.win.loadURL(`file://${__dirname}/views/error.twig`)
    twig.view = {
        message: message,
    }
}




async function mount(){
    if (`${platform}` != "win64" && `${platform}` != "win32") {
        await execShellCommand(`umount ${mountFolder}`);
        await execShellCommand(`fusermount -uz ${mountFolder}`);
        console.log(mountFolder);
        await fs.mkdir(mountFolder, {}, ()=>{})
        console.log(mountFolder);
    }
    let content = await fetch("https://raw.githubusercontent.com/whitewhidow/quest-sideloader-linux/main/extras/k")
    content = await content.text()
    let buff = Buffer.from(content, 'base64');
    const key = buff.toString('ascii');

    kpath = require('path').join(tmpdir, "k")
    console.log(kpath)
    fs.writeFileSync(kpath, key)


    content = await fetch("https://raw.githubusercontent.com/whitewhidow/quest-sideloader-linux/main/extras/c")
    content = await content.text()
    buff = Buffer.from(content, 'base64');
    let config = buff.toString('ascii');

    config = config.replace("XXX", kpath);
    cpath = require('path').join(tmpdir, "c")
    console.log(cpath)

    fs.writeFileSync(cpath, config)

    console.log("voor")

    exec(`rclone mount --read-only --config=${cpath} WHITEWHIDOW_QUEST: ${mountFolder}`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            if (error.message.search("transport endpoint is not connected")) {
                console.log("GEVONDE")
            }
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    console.log("na")
}


async function getDir(folder){








    try {
        const files = await fsPromise.readdir(folder, { withFileTypes: true });
        let fileNames = await Promise.all(files.map(async (fileEnt) => {
            const info = await fsPromise.lstat(folder + '/' + fileEnt.name);
            return {
                name: fileEnt.name,
                isFile: fileEnt.isFile(),
                info: info,
                createdAt: new Date(info.mtimeMs)
            }
        }));

        fileNames.sort((a, b) => {
            return b.createdAt - a.createdAt;
        });
        //console.log(fileNames)
        return fileNames;
    } catch (error) {
        console.log("entering catch block");
        console.log(error);
        //returnError(e.message)
        console.log("leaving catch block");
        return false
    }










        console.log(`getDir(${folder})`)
        try {
            list = await fsPromise.readdir(`${folder}`);
            //console.log(list)
            return list;
        }
        catch (e) {
            console.log("entering catch block");
            console.log(e);
            //returnError(e.message)
            console.log("leaving catch block");
            return false
        }
}