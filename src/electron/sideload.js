import { existsSync, statSync, createWriteStream } from "fs";
import adbkit from "@devicefarmer/adbkit";
import path from "path";
import ApkReader from "node-apk-parser";

import globals from "./globals";
import { copy, waitForJob } from "./rclone";
import { formatEta, formatBytes } from "../utils/formatter";
import {
  mkdirsSync,
  deleteFolderRecursive,
  workdir,
  getFiles,
} from "../utils/fs";
import { Logger } from "../utils/logger";
import { getAppInfo, getDeviceFiles } from "./devices";
import { platform } from "os";

export function bind(ipcMain) {
  ipcMain.on("sideload_folder", sideloadFolder);
  ipcMain.on("uninstall_app", uninstallApp);
  ipcMain.on("sideload_local_apk", sideLoadLocalApk);
  ipcMain.on("sideload_local_folder", sideLoadLocalFolder);
}

async function sideloadFolder(event, args) {
  const logger = new Logger("Sideload");
  logger.info("args:", args);

  const isInstalled = args.app.installedVersion !== -1;

  const tasks = [
    {
      key: "device",
      text: "Checking device",
      started: true,
      loading: true,
      status: false,
      show: true,
    },
    {
      key: "download",
      text: "Download files",
      started: false,
      loading: false,
      status: false,
      show: !args.local,
    },
    {
      key: "packageinfo",
      text: "Read packageinfo",
      started: false,
      loading: false,
      status: false,
      show: true,
    },
    {
      key: "install1",
      text: "Install APK",
      started: false,
      loading: false,
      status: false,
      show: true,
    },
    {
      key: "backup",
      text: "Backup Appdata",
      started: false,
      loading: false,
      status: false,
      show: false,
    },
    {
      key: "uninstall",
      text: "Uninstall APK",
      started: false,
      loading: false,
      status: false,
      show: false,
    },
    {
      key: "restore",
      text: "Restore Appdata",
      started: false,
      loading: false,
      status: false,
      show: false,
    },
    {
      key: "install2",
      text: "Install APK",
      started: false,
      loading: false,
      status: false,
      show: false,
    },
    {
      key: "copy_obb",
      text: "Copy OBB",
      started: false,
      loading: false,
      status: false,
      show: args.data.hasObb,
    },
    {
      key: "cleanup",
      text: "Cleanup",
      started: false,
      loading: false,
      status: false,
      show: true,
    },
    {
      key: "done",
      text: "Sideload finished",
      started: false,
      loading: false,
      status: false,
      show: true,
    },
  ];

  globals.win.webContents.send("sideload_folder_progress", { items: tasks });

  // Check for connected device
  const deviceState = await globals.adb.getState(globals.device.id);
  logger.debug("deviceState:", deviceState);
  if (!deviceState) {
    updateTask(tasks, "device", true, false, false, "No device connected");
    globals.win.webContents.send("sideload_folder_progress", {
      items: tasks,
      done: true,
      success: false,
      error: "No device connected",
    });
    return;
  } else {
    updateTask(
      tasks,
      "device",
      true,
      false,
      true,
      "Device connected - " + globals.device.id
    );
  }
  globals.win.webContents.send("sideload_folder_progress", { items: tasks });

  // Download folder
  let apkFile = null;
  let tempFolder = null;
  if (args.local) {
    apkFile = args.path;
    tempFolder = path.join(workdir(), args.app.packageName);
    logger.debug("tempFolder:", tempFolder);
    if (existsSync(tempFolder)) {
      logger.debug("delete tempFolder");
      await deleteFolderRecursive(tempFolder);
    }
    mkdirsSync(tempFolder, { recursive: true });
  } else {
    updateTask(tasks, "download", true, true, false, "Starting download...");

    tempFolder = path.join(workdir(), args.data.path);
    logger.debug("tempFolder:", tempFolder);
    if (existsSync(tempFolder)) {
      logger.debug("delete tempFolder");
      try {
        await deleteFolderRecursive(tempFolder);
      } catch (err) {
        logger.error("delete tempFolder failed", err);
      }
    }
    mkdirsSync(tempFolder, { recursive: true });

    apkFile = path.join(tempFolder, args.data.apk.Name);

    logger.debug("copy", args.data.path, "to", tempFolder);

    const jobId = await copy(args.data.path, tempFolder);

    await waitForJob(jobId, (data) => {
      if (data.percentage) {
        updateTask(
          tasks,
          "download",
          true,
          true,
          false,
          "Downloading files - " +
            data.percentage +
            "% (" +
            formatBytes(data.bytes) +
            " / " +
            formatBytes(data.size) +
            ")" +
            " - " +
            formatBytes(data.speedAvg) +
            "/s" +
            " - " +
            formatEta(data.eta)
        );
      }
    });
    logger.debug("Job", jobId, "has finished");

    const apkFileExists = existsSync(apkFile);
    updateTask(
      tasks,
      "download",
      true,
      false,
      apkFileExists,
      apkFileExists ? "Download completed" : "Download failed"
    );

    if (!apkFileExists) {
      // Cancel because download failed
      globals.win.webContents.send("sideload_folder_progress", {
        items: tasks,
        done: true,
        success: false,
        error: apkFile + " not found",
      });
      return;
    }
  }

  // Read package info from filename or file content
  const packageName = args.app.packageName;
  const reader = ApkReader.readFile(apkFile);
  const manifest = reader.readManifestSync();
  const filePackageName = manifest.package;

  if (packageName != filePackageName) {
    updateTask(
      tasks,
      "packageinfo",
      true,
      false,
      false,
      "Unexpected package name in file: " + filePackageName
    );
    globals.win.webContents.send("sideload_folder_progress", {
      items: tasks,
      done: true,
      success: false,
      error:
        "Unexpected package name in file: " +
        filePackageName +
        " (should be " +
        packageName +
        ")",
    });
    return;
  }

  updateTask(tasks, "packageinfo", true, false, true, undefined);

  updateTask(tasks, "install1", true, true, false, "Installing app");

  const normalInstall = await installApp(globals.device.id, apkFile);
  updateTask(
    tasks,
    "install1",
    true,
    false,
    normalInstall === true,
    normalInstall === true
      ? "Installed app"
      : "Installation failed - " + normalInstall
  );

  if (normalInstall == undefined) {
    globals.win.webContents.send("sideload_folder_progress", {
      items: tasks,
      done: true,
      success: false,
      error: "Unexpected install error",
    });
    return;
  }

  // TODO: Check error type
  if (normalInstall !== true) {
    // Show extra steps
    let task = tasks.filter((x) => x.key === "backup")[0];
    task.show = true;
    task = tasks.filter((x) => x.key === "uninstall")[0];
    task.show = true;
    task = tasks.filter((x) => x.key === "restore")[0];
    task.show = true;
    task = tasks.filter((x) => x.key === "install2")[0];
    task.show = true;
    globals.win.webContents.send("sideload_folder_progress", { items: tasks });

    const appdataFolder = path.join(tempFolder, "appdata");
    mkdirsSync(appdataFolder, { recursive: true });

    updateTask(tasks, "backup", true, true);
    await adbPull(`/sdcard/Android/data/${packageName}`, appdataFolder);
    updateTask(tasks, "backup", true, false, true);

    updateTask(tasks, "uninstall", true, true);
    await globals.adb.uninstall(globals.device.id, packageName);
    updateTask(tasks, "uninstall", true, false, true);

    updateTask(tasks, "restore", true, true);
    globals.win.webContents.send("sideload_folder_progress", { items: tasks });
    await adbPush(appdataFolder, `/sdcard/Android/data/${packageName}`);
    await deleteFolderRecursive(appdataFolder);
    updateTask(tasks, "restore", true, false, true);

    updateTask(tasks, "install2", true, true, false, "Installing app");
    const freshInstall = await installApp(globals.device.id, apkFile);
    updateTask(
      tasks,
      "install2",
      true,
      false,
      freshInstall === true,
      freshInstall === true
        ? "Installed app"
        : "Installation failed - " + freshInstall
    );

    if (freshInstall == undefined) {
      globals.win.webContents.send("sideload_folder_progress", {
        items: tasks,
        done: true,
        success: false,
        error: "Unexpected install error",
      });
      return;
    }
  }

  if (!args.data.hasObb) {
    updateTask(
      tasks,
      "copy_obb",
      false,
      true,
      false,
      "Copy OBB - Skipped (no obb files)"
    );
  } else {
    updateTask(tasks, "copy_obb", true, true, false, "Copying OBB files...");

    const deviceObbFolder = `/sdcard/Android/obb/${packageName}`;
    let obbFolder = path.join(tempFolder, packageName);
    if (args.local) {
      obbFolder = path.join(path.dirname(args.path), packageName);
    }

    await globals.adb
      .shell(globals.device.id, `rm -r "${deviceObbFolder}"`)
      .then(adbkit.util.readAll);

    logger.debug("adb push", obbFolder, "to", deviceObbFolder);
    await adbPush(obbFolder, deviceObbFolder, (i, t, s, m) => {
      updateTask(tasks, "copy_obb", true, true, false, `[${i + 1}/${t}] ${m}`);
    });

    updateTask(tasks, "copy_obb", true, false, true, "OBB files copied");
  }

  updateTask(tasks, "cleanup", true, true, false, "Cleanup...");

  // Delete tempFolder
  await deleteFolderRecursive(tempFolder);

  updateTask(tasks, "cleanup", true, false, true, "Cleanup finished");

  updateTask(tasks, "done", true, false, true);

  globals.win.webContents.send("sideload_folder_progress", {
    items: tasks,
    done: true,
    success: true,
    task: isInstalled ? "update" : "install",
    packageName: packageName,
  });
}

async function uninstallApp(event, args) {
  const logger = new Logger("Uninstall");
  logger.info("args:", args);

  const packageName = args.packageName;

  const tasks = [
    {
      key: "device",
      text: "Checking device",
      started: true,
      loading: true,
      status: false,
      show: true,
    },
    {
      key: "uninstall",
      text: "Uninstall APK",
      started: false,
      loading: false,
      status: false,
      show: true,
    },
    {
      key: "done",
      text: "Uninstall finished",
      started: false,
      loading: false,
      status: false,
      show: true,
    },
  ];
  globals.win.webContents.send("sideload_folder_progress", { items: tasks });

  // Check for connected device
  const deviceState = await globals.adb.getState(globals.device.id);
  logger.debug("deviceState:", deviceState);
  if (!deviceState) {
    updateTask(tasks, "device", true, false, false, "No device connected");
  } else {
    updateTask(
      tasks,
      "device",
      true,
      false,
      true,
      "Device connected - " + globals.device.id
    );
  }

  updateTask(tasks, "uninstall", true, true);
  const status = await globals.adb.uninstall(globals.device.id, packageName);
  if (status !== true) {
    console.log("UnknwownError during uninstall", status);
    updateTask(
      tasks,
      "uninstall",
      true,
      false,
      false,
      "Error during uninstall"
    );
  }
  updateTask(tasks, "uninstall", true, false, true);

  updateTask(tasks, "done", true, false, true);

  globals.win.webContents.send("sideload_folder_progress", {
    items: tasks,
    done: true,
    success: true,
    task: "uninstall",
    packageName: packageName,
  });
}

function updateTask(tasks, key, started, loading, status, text) {
  const task = tasks.filter((x) => x.key === key)[0];
  if (started != undefined) {
    task.started = started;
  }
  if (loading != undefined) {
    task.loading = loading;
  }
  if (status != undefined) {
    task.status = status;
  }
  if (text != undefined) {
    task.text = text;
  }
  globals.win.webContents.send("sideload_folder_progress", { items: tasks });
}

async function installApp(deviceId, apkFile) {
  const logger = new Logger("InstallApp");
  try {
    logger.debug("install", apkFile);
    const installState = await globals.adb.install(deviceId, apkFile);
    logger.debug("installed", installState);
    return installState;
  } catch (e) {
    logger.error("Error", e.code);
    return e.code;
  }
}

export async function adbPush(src, dst, cb) {
  if (!cb) {
    cb = () => {};
  }
  const files = await getFiles(src);
  let totalSize = 0;
  for (const file of files) {
    totalSize += statSync(file).size;
  }
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relName = file.slice(src.length + 1);
    let dstFile = dst + "/" + relName;
    if (platform() === "win32") {
      // Fix path separator on Windows (getFiles returns \ but we need / on the Android side)
      dstFile = dstFile.replace(/\\/g, "/");
    }
    cb(i, files.length, totalSize, `Sending ${relName}`);
    await globals.adb
      .push(globals.device.id, file, dstFile)
      .then(function (transfer) {
        return new Promise(function (resolve, reject) {
          transfer.on("end", function () {
            resolve();
          });
          transfer.on("error", reject);
        });
      });
    cb(i, files.length, totalSize, relName + " - Done");
  }
}

export async function adbPull(src, dst) {
  const files = await getDeviceFiles(globals.device.id, src);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relName = file.slice(src.length + 1);
    const dstFile = path.join(dst, relName);
    // Create folder as needed
    await mkdirsSync(path.dirname(dstFile));
    await globals.adb.pull(globals.device.id, file).then(function (transfer) {
      return new Promise(function (resolve, reject) {
        transfer.on("end", function () {
          resolve(dstFile);
        });
        transfer.on("error", reject);
        transfer.pipe(createWriteStream(dstFile));
      });
    });
  }
}

async function sideLoadLocalApk(event, args) {
  const logger = new Logger("Sideload APK");
  logger.info("args:", args);

  const reader = ApkReader.readFile(args.path);
  const manifest = reader.readManifestSync();

  const installed = await getAppInfo(manifest.package, false);
  logger.info("installed:", installed);

  // Build data for sideload_folder
  const sideloadArgs = {
    local: true,
    path: args.path,
    app: {
      packageName: manifest.package,
      installedVersion: installed == null ? -1 : installed.versionCode,
    },
    data: {
      hasObb: false,
    },
  };

  sideloadFolder(sideloadArgs);
}

async function sideLoadLocalFolder(event, args) {
  const logger = new Logger("Sideload Folder");
  logger.info("args:", args);

  const reader = ApkReader.readFile(args.path);
  const manifest = reader.readManifestSync();

  const installed = await getAppInfo(manifest.package, false);
  logger.info("installed:", installed);

  // Build data for sideload_folder
  const sideloadArgs = {
    local: true,
    path: args.path,
    app: {
      packageName: manifest.package,
      installedVersion: installed == null ? -1 : installed.versionCode,
    },
    data: {
      hasObb: true,
    },
  };

  sideloadFolder(sideloadArgs);
}
