import { platform } from "os";
import { sync as commandExistsSync } from "command-exists";
import settings from "electron-settings";
import adbkit from "@devicefarmer/adbkit";

import { execShellCommand } from "../utils/shell";
import { workdir } from "../utils/fs";
import globals from "./globals";

export function bind(ipcMain) {
  ipcMain.on("check_deps_platform", checkDepsPlatform);
  ipcMain.on("check_deps_work_dir", checkDepsWorkdir);
  ipcMain.on("check_deps_adb", checkDepsAdb);
  ipcMain.on("check_deps_rclone", checkDepsRclone);
}

function checkDepsPlatform(event) {
  event.reply("check_deps_platform", {
    status: true,
    value: "Platform: " + platform,
  });
}

function checkDepsWorkdir(event) {
  event.reply("check_deps_work_dir", {
    status: true,
    value: "Work dir: " + workdir(),
  });
}

async function checkDepsAdb(event) {
  let adbPath = "adb";
  if (settings.hasSync("adb.executable")) {
    adbPath = settings.getSync("adb.executable");
  }
  const exists = commandExistsSync(adbPath);
  let version = null;

  if (exists) {
    let output = await execShellCommand(`${adbPath} --version`);
    version = output.split("\n")[1].trim().split(" ")[1];

    globals.adb = adbkit.createClient({ bin: adbPath });
  }

  event.reply("check_deps_adb", {
    status: exists,
    value: exists ? "Adb detected - v" + version : "Adb not fould",
  });
}

async function checkDepsRclone(event) {
  let rclonePath = "rclone";
  if (settings.hasSync("rclone.executable")) {
    rclonePath = settings.getSync("rclone.executable");
  }
  const exists = commandExistsSync(rclonePath);
  let version = null;

  if (exists) {
    let output = await execShellCommand(`${rclonePath} --version`);
    version = output.split("\n")[0].trim().split(" ")[1];
  }

  event.reply("check_deps_rclone", {
    status: exists,
    value: exists ? "Rclone detected - " + version : "Adb not fould",
  });
}
