const exec = require('child_process').exec;
var adb = require('adbkit')
var client = adb.createClient();
const fs = require('fs');
const fsPromise = fs.promises;
var platform = require('os').platform;


var fetch = require('node-fetch')
var path = require('path')
var commandExists = require('command-exists');


const packageInfo = require('node-aapt');


const promise = require('promise')


module.exports =
{
    getDeviceSync,
    trackDevices,
    checkDeps,
    checkMount,
    mount,
    getDir,
    returnError,
    sideloadFolder,
    // ...
}



// Implementation ----------------------------------

function getDeviceSync(){
    client.listDevices()
        .then(function(devices) {
            console.log("getDevice()")
            if (devices.length > 0) {
                global.adbDevice = devices[0].id
                win.webContents.send('get_device',`{success:"${devices[0].id}"}`);
            } else {
                global.adbDevice = false
                win.webContents.send('get_device',{success: false});
            }
        })
        .catch(function(err) {
            console.error('Something went wrong:', err.stack)
        })
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
            if (stdout) {
                console.log(stdout)
                resolve(stdout);
            } else {
                console.log(stderr)
                resolve(stderr);
            }
        });
    });
}


function trackDevices(){
    console.log("trackDevices()")
    client.trackDevices()
        .then(function(tracker) {
            tracker.on('add', function(device) {
                win.webContents.send('get_device',`{success:"${device.id}"}`);
                global.adbDevice = device.id
                console.log('Device %s was plugged in', `{success:${device.id}`)
            })
            tracker.on('remove', function(device) {
                global.adbDevice = false
                resp = {success: global.adbDevice}
                win.webContents.send('get_device',resp);
                console.log('Device %s was unplugged', resp)
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
            global.mounted = true
            return true
        }
        global.mounted = false
        return false;
    }
    catch (e) {
        console.log("entering catch block");
        console.log(e);
        console.log("leaving catch block");
        global.mounted = false
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
    try {
        exists = await commandExists('aapt');
    }
    catch (e) {
        if (`${global.platform}` == "win64" || `${global.platform}` == "win32") {
            returnError("AAPT global installation not found.")
            return
        }
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

    if (await checkMount(`${mountFolder}`)) {
        return
    }


    if (`${global.platform}` != "win64" && `${global.platform}` != "win32") {
        await execShellCommand(`umount ${mountFolder}`);
        await execShellCommand(`fusermount -uz ${mountFolder}`);
        console.log(mountFolder);
        await fs.mkdir(mountFolder, {}, ()=>{}) // folder must exist on windows
        console.log(mountFolder);
    }
    if (`${global.platform}` == "win64" || `${global.platform}` == "win32") {
        await execShellCommand(`rmdir "${mountFolder}"`); // folder must NOT exist on windows
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

    if (`${platform}` === "darwin") {
        var mountCmd = "cmount"
    } else {
        var mountCmd = "mount"
    }

    exec(`rclone ${mountCmd} --read-only --config=${cpath} WHITEWHIDOW_QUEST: ${mountFolder}`, (error, stdout, stderr) => {
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
            const info = await fsPromise.lstat(path.join(folder, fileEnt.name));
            steamid=false;oculusid=false;imagePath = false;versionCode="PROCESSING";infoLink = false;simpleName=fileEnt.name


            if (  (new RegExp(".*\ -steam-")).test(fileEnt.name)  ) {
                //steamid = fileEnt.name.split('steam-')[1]
                steamid = fileEnt.name.match(/-steam-([0-9]*)/)[1]
                simpleName = fileEnt.name.split(' -steam-')[0]
                imagePath = "https://cdn.cloudflare.steamstatic.com/steam/apps/"+steamid+"/header.jpg"
                infoLink = "https://store.steampowered.com/app/"+steamid+"/"
            }
            if (  (new RegExp(".*\ -oculus-")).test(fileEnt.name)  ) {
                //oculusid = fileEnt.name.split('oculus-')[1]
                oculusid = fileEnt.name.match(/-oculus-([0-9]*)/)[1]
                simpleName = fileEnt.name.split(' -oculus-')[0]
                imagePath = "https://vrdb.app/oculus/images/"+oculusid+".jpg"
                infoLink = "https://www.oculus.com/experiences/quest/"+oculusid+"/"
            }
            if (  (new RegExp(".*\ -versionCode-")).test(fileEnt.name)  ) {
                //oculusid = fileEnt.name.split('oculus-')[1]
                versionCode = fileEnt.name.match(/-versionCode-([0-9]*)/)[1]
                simpleName = fileEnt.name.split(' -versionCode-')[0]
            }

            simpleName = fileEnt.name.split('-QuestUnderground')[0]
            simpleName = simpleName.split(/v[0-9]*\./)[0]
            //simpleName = simpleName.split(/v[0-9][0-9]\./)[0]
            //simpleName = simpleName.split(/v[0-9][0-9][0-9]\./)[0]
            simpleName = simpleName.split(/\[[0-9]\./)[0]

                return {
                    name: fileEnt.name,
                    simpleName: simpleName,
                    isFile: fileEnt.isFile(),
                    steamId: steamid,
                    oculusId: oculusid,
                    imagePath: imagePath,
                    versionCode: versionCode,
                    infoLink: infoLink,
                    info: info,
                    createdAt: new Date(info.mtimeMs),
                    filePath: path.join(folder, fileEnt.name).replace(/\\/g,"/"),
                }
            })
        );

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

}

async function getObbsDir(folder){
        const files = await fsPromise.readdir(folder, { withFileTypes: true });
        let fileNames = await Promise.all(files.map(async (fileEnt) => {
            const info = await fsPromise.lstat(path.join(folder, fileEnt.name));
                return {
                    name: fileEnt.name,
                    isFile: fileEnt.isFile(),
                    info: info,
                    createdAt: new Date(info.mtimeMs),
                    filePath: path.join(folder, fileEnt.name).replace(/\\/g,"/"),
                }
        }));
        incList = []
        fileNames.forEach((item)=>{
            if (!item.isFile) {
                incList.push(item)
            }
        })
    if (incList.length === 0) {return false}
    if (incList.length > 1) {returnError("Too many subfolders found");return;}
        return incList[0].name;
}

async function getObbs(folder){
    const files = await fsPromise.readdir(folder, { withFileTypes: true });
    let fileNames = await Promise.all(files.map(async (fileEnt) => {
        return path.join(folder, fileEnt.name).replace(/\\/g,"/")
    }));
    return fileNames;
}

async function sideloadFolder(location) {
    console.log("sideloadFolder()")
    if (location.endsWith(".apk")) {
        apkfile = location;
        location=path.dirname(location);
    } else {
        returnError("not an apk file")
    }

    console.log("start sideload: "+apkfile)


    try {
        packageinfo = await getPackageInfo(apkfile)
        win.webContents.send('sideload_aapt_done',`{"success":true}`);
    }  catch (e) {
        console.log(e);
        returnError("AAPT failed to read the package")
    }


    console.log('doing adb UNinstall');
    try {
        await execShellCommand(`adb uninstall "${packageinfo.packageName}"`);
    }  catch (e) {
        console.log(e);
    }
    win.webContents.send('sideload_uninstall_done',`{"success":true}`);


    console.log('doing adb install');
    try {
        await execShellCommand(`adb install -g -d "${apkfile}"`);
        win.webContents.send('sideload_apk_done',`{"success":true}`);
    }  catch (e) {
        console.log(e);
    }





    obbFolder = await getObbsDir(location);
    obbFiles = [];
    if ( obbFolder ) {
        console.log("obbFolder: "+obbFolder)
        console.log('doing onn rm');
        try {
            await execShellCommand(`adb shell rm -r "/sdcard/Android/obb/${obbFolder}"`);
        }  catch (e) {
            console.log(e);
        }
        obbFiles = await getObbs(location+"/"+obbFolder);
        if (obbFiles.length > 0) {
            console.log("obbFiles: "+obbFiles)

            //TODO, make name be packageName instead of foldername
            for (const item of obbFiles) {
                console.log("obb File: "+item)
                console.log('doing obb push');
                var n = item.lastIndexOf('/');
                var name = item.substring(n + 1);
                if (`${platform}` != "win64" && `${platform}` != "win32") {
                    nullcmd = "> /dev/null"
                } else {
                    nullcmd = "> null"
                }
                await execShellCommand(`adb push "${item}" "/sdcard/Download/obb/${obbFolder}/${name}" ${nullcmd}`);
            }
            win.webContents.send('sideload_copy_obb_done',`{"success":true}`);
            console.log('doing shell mv');
            await execShellCommand(`adb shell mv "/sdcard/Download/obb/${obbFolder}" "/sdcard/Android/obb/${obbFolder}"`);
            win.webContents.send('sideload_move_obb_done',`{"success":true}`);

        }
    } else {
        win.webContents.send('sideload_copy_obb_done',`{"success":true}`);
        win.webContents.send('sideload_move_obb_done',`{"success":true}`);

    }
    win.webContents.send('sideload_done',`{"success":true}`);
    console.log('DONE');
    return;
}



async function getPackageInfo(apkPath) {

    if (`${global.platform}` == "win64" || `${global.platform}` == "win32") {
        packageStuff = await execShellCommand(`aapt dump badging "${apkPath}"`);
        packageLine = packageStuff.match(/package: (.*)/g);
        packageName = packageStuff.match(/name='([a-zA-Z.]*)'/g);
        packageName = packageName[0].split("'")[1]
        versionCode = packageStuff.match(/versionCode='([0-9a-zA-Z.]*)'/g);
        versionCode = versionCode[0].split("'")[1]
        versionName = packageStuff.match(/versionName='([0-9a-zA-Z.]*)'/g);
        versionName = versionName[0].split("'")[1]
        info = {packageName: packageName, versionCode: versionCode, versionName: versionName}
        return info
    } else {
        info = await packageInfo(`"${apkPath}"`, (err, data) => {
            if (err) {
                returnError("AAPT failed to read the package")
            }
        });
        return info
    }
}
