import settings from "electron-settings";
import flatten from "flat";

const defaultSettings = {
  rclone: {
    config: "",
    mirror: "WHITEWHIDOW_QUEST",
    root: "",
    executable: "rclone",
  },
  adb: {
    executable: "adb",
  },
};

export function bind(ipcMain) {
  ipcMain.on("put_setting", putSetting);
  ipcMain.on("get_setting", getSetting);
  ipcMain.on("get_all_setting", getAllSetting);

  // Apply default settings
  const flat = flatten(defaultSettings);
  for (const key in flat) {
    if (!settings.hasSync(key)) {
      settings.setSync(key, flat[key]);
    }
  }
}

async function putSetting(event, args) {
  settings.setSync(args.key, args.value);
  event.reply("put_setting", {
    success: true,
    key: args.key,
  });
}

async function getSetting(event, args) {
  const value = settings.getSync(args.key);
  event.reply("get_setting", {
    success: true,
    key: args.key,
    value: value,
  });
}

async function getAllSetting(event) {
  const value = settings.getSync();
  event.reply("get_all_setting", {
    success: true,
    value: flatten(value),
  });
}
