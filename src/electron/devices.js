import path from "path";
import adbkit from "@devicefarmer/adbkit";

import globals from "./globals";
import { reply } from "../utils/ipc";

const apptDst = "/data/local/tmp/aapt-arm-pie";

const supportedDevices = undefined; // ["Quest", "Quest 2"]; // TODO: Name for quest 2

export function bind(ipcMain) {
  ipcMain.on("check_device", checkDevice);
  ipcMain.on("get_storage_details", getStorageDetails);

  globals.adb
    .trackDevices()
    .then(function (tracker) {
      tracker.on("change", () => {
        checkDevice();
      });
      tracker.on("remove", () => {
        checkDevice();
      });
      tracker.on("end", () => {
        console.log("Tracking stopped");
      });
    })
    .catch((err) => {
      console.error("Something went wrong:", err.stack);
    });
}

async function filter(arr, callback) {
  const fail = Symbol();
  return (
    await Promise.all(
      arr.map(async (item) => ((await callback(item)) ? item : fail))
    )
  ).filter((i) => i !== fail);
}

function checkDevice(event) {
  globals.adb.listDevices().then(async (devices) => {
    if (devices == null) {
      devices = [];
    }

    devices = await filter(devices, async (x) => {
      if (x.type !== "device") {
        return false;
      }
      const properties = await globals.adb.getProperties(x.id);
      const name = properties["ro.product.model"];
      x.name = name;
      return supportedDevices ? supportedDevices.includes(name) : true;
    });

    if (devices.length === 0) {
      globals.device = null;
      reply(event, "check_device", {
        success: false,
        value: "No device found!",
      });
    } else {
      globals.device = devices[0];
      reply(event, "check_device", {
        success: true,
        value: devices[0].name,
        device: devices[0],
      });
    }
  });
}

export async function getInstalledApps(withName = false) {
  if (!globals.device) {
    return {};
  }

  if (withName) {
    // Push appt to device and set permissions
    // see https://android.stackexchange.com/a/188229
    const aaptSrc = globals.isDevelopment
      ? path.resolve(`${__dirname}/../build/binaries/aapt-arm-pie`)
      : path.resolve(`${process.resourcesPath}/../build/binaries/aapt-arm-pie`);

    await globals.adb
      .push(globals.device.id, aaptSrc, apptDst)
      .then(function (transfer) {
        return new Promise(function (resolve, reject) {
          transfer.on("end", function () {
            resolve();
          });
          transfer.on("error", reject);
        });
      });

    await globals.adb
      .shell(globals.device.id, `chmod 0755 ${apptDst}`)
      .then(adbkit.util.readAll);
  }

  const apps = await globals.adb.getPackages(globals.device.id, "-3");

  const appInfo = {};

  console.time("parse list");
  for (const app of apps) {
    appInfo[app] = {
      label: null,
      packageName: app,
      versionCode: null,
      versionName: null,
      debug: false,
      system: false,
    };

    const info = await getAppInfo(app, withName);
    if (info != null) {
      appInfo[app] = info;
    }
  }
  console.timeEnd("parse list");

  // Remove appt from device
  if (withName) {
    await globals.adb
      .shell(globals.device.id, `rm ${apptDst}`)
      .then(adbkit.util.readAll);
  }

  return appInfo;
}

export async function getAppInfo(packageName, withName) {
  const appInfo = {
    label: null,
    packageName: packageName,
    versionCode: null,
    versionName: null,
    debug: false,
    system: false,
  };
  try {
    const info = await globals.adb
      .shell(globals.device.id, `dumpsys package ${packageName}`)
      .then(adbkit.util.readAll)
      .then((output) => output.toString("utf-8"));

    appInfo.versionCode = parseInt(
      info.match(/versionCode=[0-9]*/)[0].slice(12)
    );

    appInfo.versionName = info.match(/versionName=(.*)/)[0].slice(12);

    let pkgFlags = /.*pkgFlags=\[(.*)\]/m.exec(info);
    if (pkgFlags) {
      pkgFlags = pkgFlags[1].trim().split(" ");

      appInfo.debug = pkgFlags.includes("DEBUGGABLE");
      appInfo.system = pkgFlags.includes("SYSTEM");
    }

    if (withName) {
      let path = /path: (\S*)/g.exec(info)[1];

      const aapt = await globals.adb
        .shell(globals.device.id, `${apptDst} d badging ${path}`)
        .then(adbkit.util.readAll)
        .then((output) => output.toString("utf-8"));

      const matches = /application-label:'(.*)'/g.exec(aapt);
      if (matches) {
        appInfo.label = matches[1];
      }
    }
  } catch (e) {
    console.error("Parse-Error:", e);
    return null;
  }
  return appInfo;
}

export async function getDeviceFiles(serial, dir) {
  const dirents = await globals.adb.readdir(globals.device.id, dir);
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = (dir + "/" + dirent.name).replace("//", "/");
      return dirent.isDirectory() ? getDeviceFiles(serial, res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

async function getStorageDetails(event) {
  let df = await globals.adb
    .shell(globals.device.id, `df /sdcard/`)
    .then(adbkit.util.readAll)
    .then((output) => output.toString("utf-8"));

  df = df
    .split("\n")[1] // Take 2nd line
    .split(" ") // Split columns
    .filter((x) => !!x); // Remove empty fields

  const used = parseInt(df[2]) * 1024;
  const free = parseInt(df[3]) * 1024;
  const total = used + free;

  event.reply("get_storage_details", {
    success: true,
    value: {
      total,
      used,
      free,
      percentUsed: Math.ceil((used / total) * 100),
    },
  });
}
