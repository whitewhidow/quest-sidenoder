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
    checkUpdateAvailable,
    getInstalledApps,
    getInstalledAppsWithUpdates,
    getApkFromFolder,
    uninstall,
    getDirListing
    // ...
}


async function checkUpdateAvailable() {
    console.log('Checking local version vs latest github version')
    remotehead = await execShellCommand("git ls-remote origin HEAD")
    await execShellCommand("git fetch")
    localhead = await execShellCommand("git rev-parse HEAD")
    //console.log(`remotehead: ${remotehead}|`)
    //console.log(`localhead: ${localhead}|`)

    if (remotehead.startsWith(localhead.replace(/(\r\n|\n|\r)/gm,""))) {
        global.updateAvailable = false
        return false
    } else {
        console.log('')
        console.log(`A update is available, please pull the latest version from github!`)
        console.log('')
        global.updateAvailable = true
        return true
    }
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
    //wtf werkt nie
    //win.webContents.send('check_deps',`{"success":true}`);
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
            steamid=false;oculusid=false;imagePath = false;versionCode="PROCESSING";infoLink = false;simpleName=fileEnt.name;packageName=false;mp=false


            if (  (new RegExp(".*\ -steam-")).test(fileEnt.name)  ) {
                //steamid = fileEnt.name.split('steam-')[1]
                steamid = fileEnt.name.match(/-steam-([0-9]*)/)[1]
                simpleName = simpleName.split(' -steam-')[0]
                imagePath = "https://cdn.cloudflare.steamstatic.com/steam/apps/"+steamid+"/header.jpg"
                infoLink = "https://store.steampowered.com/app/"+steamid+"/"
            }
            if (  (new RegExp(".*\ -oculus-")).test(fileEnt.name)  ) {
                //oculusid = fileEnt.name.split('oculus-')[1]
                oculusid = fileEnt.name.match(/-oculus-([0-9]*)/)[1]
                simpleName = simpleName.split(' -oculus-')[0]
                imagePath = "https://vrdb.app/oculus/images/"+oculusid+".jpg"
                infoLink = "https://www.oculus.com/experiences/quest/"+oculusid+"/"
            }
            if (  (new RegExp(".*\ -versionCode-")).test(fileEnt.name)  ) {
                //oculusid = fileEnt.name.split('oculus-')[1]
                versionCode = fileEnt.name.match(/-versionCode-([0-9]*)/)[1]
                simpleName = simpleName.split(' -versionCode-')[0]
            }
            if (  (new RegExp(".*\ -packageName-")).test(fileEnt.name)  ) {
                packageName = fileEnt.name.match(/-packageName-([a-zA-Z.]*)/)[1]
                simpleName = simpleName.split(' -packageName-')[0]
            }

            if (  (new RegExp(".*\ -MP-")).test(fileEnt.name)  ) {
                mp = true
            }

            if (  (new RegExp(".*\ -NA-")).test(fileEnt.name)  ) {
                na = true
            }

            simpleName = simpleName.split('-QuestUnderground')[0]
            simpleName = simpleName.split(/v[0-9]*\./)[0]
            //simpleName = simpleName.split(/v[0-9][0-9]\./)[0]
            //simpleName = simpleName.split(/v[0-9][0-9][0-9]\./)[0]
            simpleName = simpleName.split(/\[[0-9]*\./)[0]
            simpleName = simpleName.split(/\[[0-9]*\]/)[0]

                return {
                    name: fileEnt.name,
                    simpleName: simpleName,
                    isFile: fileEnt.isFile(),
                    steamId: steamid,
                    oculusId: oculusid,
                    imagePath: imagePath,
                    versionCode: versionCode,
                    packageName: packageName,
                    mp:mp,
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

async function getDirListing(folder){
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
        //await execShellCommand(`adb shell pm uninstall -k "${packageinfo.packageName}"`);
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
        packageName = packageStuff.match(/name='([a-zA-Z.]*)'/g);
        packageName = packageName[0].split("'")[1]
        versionCode = packageStuff.match(/versionCode='(\d+)'/g);
        versionCode = versionCode[0].split("'")[1]
        versionName = packageStuff.match(/versionName='([^']+)/g);
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

async function getInstalledApps(send = true) {


    apps = await execShellCommand(`adb shell cmd package list packages -3`);
    apps = apps.split("\n")
    apps.pop();

    appinfo = []
    for (x in apps) {
        apps[x] = apps[x].slice(8);
        appinfo[x] = []
        info = await execShellCommand(`adb shell dumpsys package ${apps[x]}`);
        appinfo[x]['packageName'] = apps[x];
        appinfo[x]['versionCode'] = info.match(/versionCode=[0-9]*/)[0].slice(12);

        if (send === true) {
            win.webContents.send('list_installed_app',appinfo[x]);
        }

    }

    global.installedApps = appinfo;

    return appinfo;
}

async function getInstalledAppsWithUpdates() {
    //listing = await execShellCommand(`ls "${global.mountFolder}"`);
    listing = await getDirListing(global.mountFolder);
    listing = listing.join(global.endOfLine);

    apps = await getInstalledApps(false);
    for (x in apps) {
        console.log("checking "+apps[x]['packageName'])
        var re = new RegExp(`.*${apps[x]['packageName']}.*`);
        if (  linematch = listing.match(re)  ) {
            remoteversion = linematch[0].match(/-versionCode-([0-9.]*)/)[1];
            installedVersion = apps[x]['versionCode'];
            console.log("remote version: "+remoteversion)
            console.log("installed version: "+installedVersion)
            if (remoteversion > installedVersion) {
                apps[x]['update'] = []
                apps[x]['update']['path'] = linematch[0].replace(/\\/g,"/").replace(/(\r\n|\n|\r)/gm,"")
                apps[x]['update']['versionCode'] = remoteversion
                console.log("UPDATE AVAILABLE")
                win.webContents.send('list_installed_app',apps[x]);
            }
        }
    }

    global.installedApps = apps;

    //console.log(listing)
    return apps;
}



async function getApkFromFolder(folder){
    const files = await fsPromise.readdir(folder, { withFileTypes: true });
    let fileNames = await Promise.all(files.map(async (fileEnt) => {
        return path.join(folder, fileEnt.name).replace(/\\/g,"/")
    }));
    apk = false
    fileNames.forEach((item)=>{
        console.log(item)
        if (item.endsWith(".apk")) {
            apk = item;
        }
    })

    if (!apk) {
        returnError("No apk found in "+folder)
        return
    } else {
        return apk
    }

}

async function uninstall(packageName){
    resp = await execShellCommand(`adb uninstall ${packageName}`)
}