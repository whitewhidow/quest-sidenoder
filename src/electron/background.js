"use strict";
/* global __static */

import { app, protocol, BrowserWindow, Menu, ipcMain } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import path from "path";
import open from "open";
import adbkit from "@devicefarmer/adbkit";
import settings from "electron-settings";
import unhandled from "electron-unhandled";

const isDevelopment = process.env.NODE_ENV !== "production";

unhandled();

import globals from "./globals";
globals.isDevelopment = isDevelopment;

let adbPath = "adb";
if (settings.hasSync("adb.executable")) {
  adbPath = settings.getSync("adb.executable");
}

globals.adb = adbkit.createClient({ bin: adbPath });

import { bind as depsBind } from "./check-deps";
import { bind as deviceBind } from "./devices";
import { bind as mountBind, stopMount } from "./mount";
import { bind as sideloadBind } from "./sideload";
import { bind as settingsBind } from "./settings";

depsBind(ipcMain);
deviceBind(ipcMain);
mountBind(ipcMain);
sideloadBind(ipcMain);
settingsBind(ipcMain);

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

async function createWindow() {
  // Create the browser window.
  globals.win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
    },
    icon: path.join(__static, "icon.png"),
  });

  globals.win.webContents.on("new-window", function (event, url) {
    event.preventDefault();
    open(url);
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await globals.win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) globals.win.webContents.openDevTools();
  } else {
    Menu.setApplicationMenu(null);
    createProtocol("app");
    // Load the index.html when not in development
    globals.win.loadURL("app://./index.html");
  }
}

// Quit when all windows are closed.
app.on("window-all-closed", async () => {
  await stopMount();

  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  console.log("Reading settings from", settings.file());

  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }
  createWindow();
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
