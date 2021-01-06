const exec = require('child_process').exec;
var adb = require('adbkit')
var client = adb.createClient();
const fs = require('fs');
const fsExtra = require('fs-extra');
const fsPromise = fs.promises;
var platform = require('os').platform;


var fetch = require('node-fetch')
var path = require('path')
var commandExists = require('command-exists');
var util = require('util')
var ApkReader = require('node-apk-parser')

const fixPath = require('fix-path');
fixPath();

const configLocation = require('path').join(homedir, "sidenoder-config.json")

if (`${platform}` != "win64" && `${platform}` != "win32") {
    global.nullcmd = "> /dev/null"
    global.nullerror = "2> /dev/null"
} else {
    global.nullcmd = "> null"
    global.nullerror = "2> null"
}


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
    getDirListing,
    getPackageInfo,
    getStorageInfo,
    changeConfig,
    reloadConfig,
    execShellCommand,
    updateRcloneProgress,
    // ...
}

async function getStorageInfo() {
    console.log("getStorageInfo()")

    res = await execShellCommand("adb shell df -h")

    var re = new RegExp(`.*/storage/emulated.*`);
    if (  linematch = res.match(re)  ) {
        //console.log(linematch[0])
        var refree = new RegExp(`([0-9]+[a-zA-Z%])`, "g");
        //return {success: true, nr: linematch[0].match(renr)[1], free: }
        return {success: true, storage: linematch[0].match(refree)}
    }
    return {success: false};
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
function execShellCommand(cmd, buffer = 5000) {
    return new Promise((resolve, reject) => {
        exec(cmd,  {maxBuffer: 1024 * buffer}, (error, stdout, stderr) => {
            if (error) {
                console.log('exec_error')
                //console.warn(error);
            }
            if (stdout) {
                console.log('exec_stdout')
                console.log(stdout)
                resolve(stdout);
            } else {
                console.log('exec_stderr')
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

// async function checkMount(){
//     console.log("checkMount()")
//     try {
//         await fsPromise.readdir(`${mountFolder}`);
//         list = await getDir(`${mountFolder}`);
//         if (list.length > 0) {
//             global.mounted = true
//             updateRcloneProgress();
//             return true
//         }
//         global.mounted = false
//         return false;
//     }
//     catch (e) {
//         console.log("entering catch block");
//         console.log(e);
//         console.log("leaving catch block");
//         global.mounted = false
//         return false
//     }
//     return false;
// }

async function checkMount() {
    console.log("checkMount()")
    try {
        const resp = await fetch("http://127.0.0.1:5572/rc/noop", {
            method: "post",
        });
        global.mounted = resp.ok
        return resp.ok
        //setTimeout(updateRcloneProgress, 2000);
    } catch (e) {
        global.mounted = false
        return false;
    }
}

async function checkDeps(){
    console.log("checkDeps()")
    try {
        exists = await commandExists('adb');
    }
    catch (e) {
        returnError("ADB global installation not found, please read the README on github.")
        return
    }
    try {
        exists = await commandExists('rclone');
    }
    catch (e) {
        returnError("RCLONE global installation not found, please read the README on github.")
        return
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
        await execShellCommand(`umount ${mountFolder} ${global.nullerror}`);
        await execShellCommand(`fusermount -uz ${mountFolder} ${global.nullerror}`);
        await fs.mkdir(mountFolder, {}, ()=>{}) // folder must exist on windows
    }

    if (`${global.platform}` == "win64" || `${global.platform}` == "win32") {
        await execShellCommand(`rmdir "${mountFolder}" ${global.nullerror}`); // folder must NOT exist on windows
    }

    let content = await fetch("https://raw.githubusercontent.com/whitewhidow/quest-sideloader-linux/main/extras/k")
    content = await content.text()
    let buff = Buffer.from(content, 'base64');
    const key = buff.toString('ascii');

    kpath = require('path').join(tmpdir, "k")
    //console.log(kpath)
    fs.writeFileSync(kpath, key)


    content = await fetch("https://raw.githubusercontent.com/whitewhidow/quest-sideloader-linux/main/extras/c")
    content = await content.text()
    buff = Buffer.from(content, 'base64');
    let config = buff.toString('ascii');

    config = config.replace("XXX", kpath);
    cpath = require('path').join(tmpdir, "c")
    //console.log(cpath)

    fs.writeFileSync(cpath, config)

    //console.log("voor")

    if (`${platform}` === "darwin") {
        var mountCmd = "cmount"
    } else {
        var mountCmd = "mount"
    }

    exec(`rclone ${mountCmd} --read-only --rc --rc-no-auth --config=${cpath} WHITEWHIDOW_QUEST: ${mountFolder}`, (error, stdout, stderr) => {
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
    //console.log("na")
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

            if (  (new RegExp(".*v[0-9]+\\+[0-9].*")).test(fileEnt.name)  ) {
                //oculusid = fileEnt.name.split('oculus-')[1]
                versionCode = fileEnt.name.match(/.*v([0-9]+)\+[0-9].*/)[1]
                simpleName = simpleName.split(' -versionCode-')[0]
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

            simpleName = await cleanUpFoldername(simpleName)

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
                    filePath: folder + "/" + fileEnt.name.replace(/\\/g,"/"),
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

async function cleanUpFoldername(simpleName) {
    simpleName = simpleName.replace(`${global.mountFolder}/`, "")
    simpleName = simpleName.split('-QuestUnderground')[0]
    simpleName = simpleName.split(/v[0-9]*\./)[0]
    //simpleName = simpleName.split(/v[0-9][0-9]\./)[0]
    //simpleName = simpleName.split(/v[0-9][0-9][0-9]\./)[0]
    simpleName = simpleName.split(/\[[0-9]*\./)[0]
    simpleName = simpleName.split(/\[[0-9]*\]/)[0]
    simpleName = simpleName.split(/v[0-9]+[ \+]/)[0]
    simpleName = simpleName.split(/v[0-9]+$/)[0]

    return simpleName;
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

async function sideloadFolder(arg) {
    location = arg.path;
    console.log("sideloadFolder()")
    if (location.endsWith(".apk")) {
        apkfile = location;
        location=path.dirname(location);
    } else {
        returnError("not an apk file")
    }

    console.log("start sideload: "+apkfile)

    fromremote = false
    if (location.includes(global.mountFolder)) {
        fromremote = true
    }

    console.log("fromremote:" + fromremote);

    packageName = ''
    try {
        console.log("attempting to read package info")


        if (apkfile.match(/-packageName-([a-zA-Z\d\_.]*)/)) {
            packageName = apkfile.match(/-packageName-([a-zA-Z\d\_.]*)/)[1]
        } else {
            //TODO: copy

            if (fromremote) {
                tempapk = global.tmpdir+"/"+path.basename(apkfile);
                console.log('is remote, copying to '+ tempapk)

                if (fsExtra.existsSync(`${tempapk}`)) {
                    console.log('is remote, '+ tempapk+ 'already exists, using')
                } else {
                    await fsExtra.copyFile(`${apkfile}`, `${tempapk}`);
                }

                packageinfo = await getPackageInfo(`${tempapk}`)
            } else {
                packageinfo = await getPackageInfo(apkfile)
            }

            packageName = packageinfo.packageName
        }


        win.webContents.send('sideload_aapt_done',`{"success":true}`);
        console.log("package info read success ("+packageName+")")
    }  catch (e) {
        console.log(e);
        returnError(e)
    }

    console.log('checking if installed');
    installed = false;
    try {
        //await execShellCommand(`adb shell pm uninstall -k "${packageinfo.packageName}"`);
        check = await execShellCommand(`adb shell pm list packages ${packageName}`);
        if (check.startsWith("package:")) {
            installed = true
        }
    }  catch (e) {
        console.log(e);
    }
    win.webContents.send('sideload_check_done',`{"success":true}`);

    if (installed) {
        console.log('doing adb pull appdata (ignore error)');
        try {

            if (!fs.existsSync(global.tmpdir+"/sidenoder_restore_backup")){
                fs.mkdirSync(global.tmpdir+"/sidenoder_restore_backup");
            }

            //await execShellCommand(`adb shell pm uninstall -k "${packageinfo.packageName}"`);
            await execShellCommand(`adb pull "/sdcard/Android/data/${packageName}" "${global.tmpdir}/sidenoder_restore_backup"`, 100000);
        }  catch (e) {
            //console.log(e);
        }
    }
    win.webContents.send('sideload_backup_done',`{"success":true}`);


    if (installed) {
        console.log('doing adb uninstall (ignore error)');
        try {
            //await execShellCommand(`adb shell pm uninstall -k "${packageinfo.packageName}"`);
            await execShellCommand(`adb uninstall "${packageName}"`);
        }  catch (e) {
            //console.log(e);
        }
    }
    win.webContents.send('sideload_uninstall_done',`{"success":true}`);

    if (installed) {
        console.log('doing adb push appdata (ignore error)');
        try {
            await execShellCommand(`adb shell mkdir -p /sdcard/Android/data/${packageName}/`);
            await execShellCommand(`adb push ${global.tmpdir}/sidenoder_restore_backup/${packageName}/* /sdcard/Android/data/${packageName}/`, 100000);

            try {
                //TODO: check settings
                //fs.rmdirSync(`${global.tmpdir}/sidenoder_restore_backup/${packageName}/`, { recursive: true });
            } catch (err) {
                //console.error(`Error while deleting ${dir}.`);
            }


        }  catch (e) {
            //console.log(e);
        }
    }
    win.webContents.send('sideload_restore_done',`{"success":true}`);



    console.log('doing adb install');
    try {

        if (fromremote) {
            tempapk = global.tmpdir+"/"+path.basename(apkfile);
            console.log('is remote, copying to '+ tempapk)

            if (fsExtra.existsSync(`${tempapk}`)) {
                console.log('is remote, '+ tempapk+ 'already exists, using')
            } else {
                await fsExtra.copyFile(`${apkfile}`, `${tempapk}`);
            }

            win.webContents.send('sideload_download_done',`{"success":true}`);
            await execShellCommand(`adb install -g -d "${tempapk}"`);
            //TODO: check settings
            execShellCommand(`rm "${tempapk}"`);
        } else {
            win.webContents.send('sideload_download_done',`{"success":true}`);
            await execShellCommand(`adb install -g -d "${apkfile}"`);
        }

        win.webContents.send('sideload_apk_done',`{"success":true}`);
    }  catch (e) {
        console.log(e);
    }



    try {
        await fsPromise.readdir(location+"/"+packageName, { withFileTypes: true });
        obbFolder = packageName
        console.log("DATAFOLDER to copy:"+obbFolder)
    } catch (error) {
        obbFolder = false
    }

    obbFiles = [];
    if ( obbFolder ) {
        console.log('doing obb rm');
        try {
            await execShellCommand(`adb shell rm -r "/sdcard/Android/obb/${obbFolder}"`);
        }  catch (e) {
            //console.log(e);
        }
        obbFiles = await getObbs(location+"/"+obbFolder);
        if (obbFiles.length > 0) {
            //console.log("obbFiles: "+obbFiles)

            if (!fs.existsSync(global.tmpdir+"/"+packageName)){
                fs.mkdirSync(global.tmpdir+"/"+packageName);
            } else {
                console.log(global.tmpdir+"/"+packageName+ ' already exists')
            }

            //TODO, make name be packageName instead of foldername
            for (const item of obbFiles) {
                console.log("obb File: "+item)
                console.log('doing obb push');
                var n = item.lastIndexOf('/');
                var name = item.substring(n + 1);


                if (fromremote) {
                    tempobb = global.tmpdir+"/"+packageName+"/"+path.basename(item);
                    console.log('obb is remote, copying to '+ tempobb)

                    if (fsExtra.existsSync(tempobb)) {
                        console.log('obb is remote, '+ tempobb+ 'already exists, using')
                    } else {
                        await fsExtra.copyFile(`${item}`, `${tempobb}`);
                    }
                    await execShellCommand(`adb push "${tempobb}" "/sdcard/Download/obb/${obbFolder}/${name}" ${nullcmd}`);
                    //TODO: check settings
                    //execShellCommand(`rm "${tempobb}"`);
                } else {
                    await execShellCommand(`adb push "${item}" "/sdcard/Download/obb/${obbFolder}/${name}" ${nullcmd}`);
                }



            }
            win.webContents.send('sideload_copy_obb_done',`{"success":true}`);
            console.log('doing shell mv');
            await execShellCommand(`adb shell mv "/sdcard/Download/obb/${obbFolder}" "/sdcard/Android/obb/${obbFolder}"`);
            win.webContents.send('sideload_move_obb_done',`{"success":true}`);

        }
    } else {
        win.webContents.send('sideload_download_obb_done',`{"success":true}`);
        win.webContents.send('sideload_copy_obb_done',`{"success":true}`);
        win.webContents.send('sideload_move_obb_done',`{"success":true}`);

    }
    win.webContents.send('sideload_done',`{"success":true, "update": ${arg.update}}`);
    console.log('DONE');
    return;
}



async function getPackageInfo(apkPath) {



    reader = await ApkReader.readFile(`${apkPath}`)
    manifest = await reader.readManifestSync()

    console.log(util.inspect(manifest.versionCode, { depth: null }))
    console.log(util.inspect(manifest.versionName, { depth: null }))
    console.log(util.inspect(manifest.package, { depth: null }))

    //console.log(manifest)

    info = {
        packageName : util.inspect(manifest.package, { depth: null }).replace(/\'/g,""),
        versionCode : util.inspect(manifest.versionCode, { depth: null }).replace(/\'/g,""),
        versionName : util.inspect(manifest.versionName, { depth: null }).replace(/\'/g,"")
    };
    return info;
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

        propername = apps[x].replace(/(\r\n|\n|\r)/gm,"");

        appinfo[x]['packageName'] = propername;
        appinfo[x]['versionCode'] = info.match(/versionCode=[0-9]*/)[0].slice(12);
        if (info.match(/ DEBUGGABLE /)) {
            appinfo[x]['debug'] = true
        } else {
            appinfo[x]['debug'] = false
        }

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
        var re = new RegExp(`.*${apps[x]['packageName']}.*`, "g");
        if (  linematch = listing.match(re)  ) {

            //linematch.pop()

            for (line in linematch) {

                console.log(linematch[line])
                remoteversion = linematch[line].match(/-versionCode-([0-9.]*)/)[1];
                installedVersion = apps[x]['versionCode'];

                properpath = linematch[line].replace(/\\/g, "/").replace(/(\r\n|\n|\r)/gm, "");
                simpleName = await cleanUpFoldername(properpath)


                //TODO: path
                console.log("remote version: " + remoteversion)
                console.log("installed version: " + installedVersion)
                if (remoteversion > installedVersion) {
                    apps[x]['update'] = []
                    apps[x]['update']['path'] = properpath
                    //apps[x]['update']['simpleName'] = simpleName
                    apps[x]['packageName'] = simpleName
                    apps[x]['update']['versionCode'] = remoteversion
                    console.log("UPDATE AVAILABLE")
                    win.webContents.send('list_installed_app', apps[x]);
                }
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




function updateRcloneProgress() {
    const response = fetch('http://127.0.0.1:5572/core/stats', {method: 'POST'})
        .then(response => response.json())
        .then(data => {
            //console.log('sending rclone data');
            win.webContents.send('rclone_data',data);
            setTimeout(updateRcloneProgress, 2000);
        })
        .catch((error) => {
            //console.error('Fetch-Error:', error);
            win.webContents.send('rclone_data','');
            setTimeout(updateRcloneProgress, 2000);
        });
}

function reloadConfig() {
    const defaultConfig = {autoMount: false};
    try {
        if (fs.existsSync(configLocation)) {
            console.log("Config exist, using " + configLocation);
            global.currentConfiguration = require(configLocation);
        } else {
            console.log("Config doesnt exist, creating ") + configLocation;
            fs.writeFileSync(configLocation, JSON.stringify(defaultConfig))
            global.currentConfiguration = defaultConfig;
        }
    } catch(err) {
        console.error(err);
    }
}



function changeConfig(key, value) {
    global.currentConfiguration[key] = value;
    console.log(global.currentConfiguration[key]);
    fs.writeFileSync(configLocation, JSON.stringify(global.currentConfiguration))
}