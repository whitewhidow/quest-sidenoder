import { writeFileSync } from "fs";
import fetch from "node-fetch";
import path from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import settings from "electron-settings";
import ogs from "open-graph-scraper";
import ElectronStore from "electron-store";

// import globals from "./globals";
import { check, list as rcloneList } from "./rclone";
import { getInstalledApps } from "./devices";
import globals from "./globals";

export function bind(ipcMain) {
  ipcMain.on("check_mount", checkMount);
  ipcMain.on("ls_dir", listDir);
  ipcMain.on("check_folder", checkFolder);
  ipcMain.on("get_installed_apps", getInstalledAppsFromDevice);
}

async function checkMount(event) {
  if (await check()) {
    event.reply("check_mount", {
      success: true,
      value: "Connected",
    });
  } else {
    connectMount(event);
  }
}

async function connectMount(event) {
  try {
    let cpath = null;
    if (settings.hasSync("rclone.config")) {
      cpath = settings.getSync("rclone.config");
    }

    if (cpath == "" || cpath == null) {
      let key = await fetch(
        "https://raw.githubusercontent.com/whitewhidow/quest-sideloader-linux/main/extras/k"
      )
        .then((resp) => resp.text())
        .then((content) => Buffer.from(content, "base64").toString("ascii"));

      const kpath = path.join(tmpdir(), "k");
      writeFileSync(kpath, key);

      let config = await fetch(
        "https://raw.githubusercontent.com/whitewhidow/quest-sideloader-linux/main/extras/c"
      )
        .then((resp) => resp.text())
        .then((content) => Buffer.from(content, "base64").toString("ascii"));

      config = config.replace("XXX", kpath);
      cpath = path.join(tmpdir(), "c");
      writeFileSync(cpath, config);
    }

    let rclonePath = "rclone";
    if (settings.hasSync("rclone.executable")) {
      rclonePath = settings.getSync("rclone.executable");
    }
    const cmd = `${rclonePath} rcd --rc-no-auth --config "${cpath}"`;
    console.log("Start Rclone in RC mode:", cmd);
    exec(cmd);

    event.reply("check_mount", {
      success: true,
      value: "Connected",
    });
  } catch (err) {
    console.log("Error in connectMount", err);
  }
}

export async function stopMount() {
  if (!(await check())) {
    return true;
  } else {
    console.log("sending quit to rclone");
    await fetch("http://127.0.0.1:5572/core/quit", {
      method: "post",
    });
    return true;
  }
}

async function list(dir) {
  if (dir === "/") {
    if (settings.hasSync("rclone.root")) {
      dir = settings.getSync("rclone.root");
    } else {
      dir = "";
    }
  }

  let list = await rcloneList(dir);
  const installedApps = dir === "" ? await getInstalledApps(false) : {};

  list = parseList(dir, list, installedApps);
  return list;
}

async function parseList(folder, items, installedApps) {
  const list = [];
  for (const item of items) {
    if (item.Name.startsWith(".") || !item.IsDir) {
      continue;
    }

    const entry = {
      name: item.Name,
      simpleName: item.Name,
      IsDir: item.IsDir,
      imagePath: null,
      versionCode: null,
      versionName: null,
      installedVersion: -1,
      packageName: null,
      mp: false,
      na: false,
      infoLink: null,
      info: null,
      createdAt: new Date(item.ModTime),
      filePath: item.Path.replace(/\\/g, "/"),
    };

    if (new RegExp(".* -steam-").test(item.Name)) {
      const steamid = item.Name.match(/-steam-([0-9]*)/)[1];
      entry.simpleName = entry.simpleName.split(" -steam-")[0];
      entry.imagePath =
        "https://cdn.cloudflare.steamstatic.com/steam/apps/" +
        steamid +
        "/header.jpg?t=" +
        Date.now();
      entry.infoLink = "https://store.steampowered.com/app/" + steamid + "/";
    }
    if (new RegExp(".* -oculus-").test(item.Name)) {
      const oculusid = item.Name.match(/-oculus-([0-9]*)/)[1];
      entry.simpleName = entry.simpleName.split(" -oculus-")[0];
      entry.infoLink =
        "https://www.oculus.com/experiences/quest/" + oculusid + "/";

      const image = await getOculusImage(oculusid);
      if (image) {
        entry.imagePath = image;
      } else {
        entry.imagePath = "https://vrdb.app/oculus/images/" + oculusid + ".jpg";
      }
    }
    if (new RegExp(".* -versionCode-").test(item.Name)) {
      //oculusid = fileEnt.name.split('oculus-')[1]
      entry.versionCode = item.Name.match(/-versionCode-([0-9]*)/)[1];
      entry.simpleName = entry.simpleName.split(" -versionCode-")[0];
    }
    if (new RegExp(".* -packageName-").test(item.Name)) {
      entry.packageName = item.Name.match(/-packageName-([a-zA-Z0-9_.]*)/)[1];
      entry.simpleName = entry.simpleName.split(" -packageName-")[0];
    }

    if (new RegExp(".* -MP-").test(item.Name)) {
      entry.mp = true;
    }

    if (new RegExp(".* -NA-").test(item.Name)) {
      entry.na = true;
    }

    const versionName = entry.simpleName.match(/v(\d\S*)/);
    if (versionName == null) {
      const versionNameAlt = entry.simpleName.match(/\[(\d\S*)\]/);
      if (versionNameAlt == null) {
        console.log("parse versionName failed for", entry.simpleName);
      } else {
        entry.versionName = "v" + versionNameAlt[1];
      }
    } else {
      entry.versionName = "v" + versionName[1];
    }

    entry.simpleName = cleanUpFoldername(entry.simpleName);

    if (!entry.imagePath) {
      entry.imagePath = `https://dummyimage.com/460x215/000/fff.jpg&text=${entry.simpleName}`;
    }

    // Check if installed
    if (installedApps[entry.packageName]) {
      entry.installedVersion = installedApps[entry.packageName].versionCode;
    }

    list.push(entry);
  }

  return list;
}

async function getOculusImage(oculusId) {
  const store = new ElectronStore({ name: "oculus-image-cache" });

  // Check cache entry age
  if (store.has("image." + oculusId)) {
    const age = Date.now() - store.get("image." + oculusId + ".created");
    // Invalidate if entry is older than 7 days
    if (age > 604800000) {
      store.delete("image." + oculusId);
    }
  }

  if (store.has("image." + oculusId)) {
    return store.get("image." + oculusId + ".url");
  } else {
    // Start fetch and store result. Nofify list to update image
    const pageUrl =
      "https://www.oculus.com/experiences/quest/" + oculusId + "/";
    ogs(
      {
        url: pageUrl,
        timeout: 5000,
      },
      (error, result) => {
        if (!error) {
          store.set("image." + oculusId, {
            url: result.ogImage.url,
            created: Date.now(),
          });

          // Notify frontend list
          globals.win.webContents.send("browse_better_image_ready", {
            infoLink: pageUrl,
            imageUrl: result.ogImage.url,
          });
        }
      }
    );

    return null;
  }
}

async function listDir(event, args) {
  try {
    const items = await list(args.path);
    event.reply("ls_dir", {
      success: true,
      value: items,
    });
  } catch (e) {
    event.reply("ls_dir", {
      success: false,
      error: e,
    });
  }
}

async function checkFolder(event, args) {
  const files = await rcloneList(args.path, { recurse: true });

  let totalSize = 0;
  for (const file of files) {
    if (file.IsDir) continue;
    totalSize += file.Size;
  }

  const apkFiles = files.filter(
    (x) => x.MimeType === "application/vnd.android.package-archive"
  );
  if (apkFiles.length === 0 || apkFiles.length > 1) {
    event.reply("check_folder", {
      success: false,
      error:
        "Unexpected number of APK files in folder (was " +
        apkFiles.length +
        ")",
    });
    return;
  }
  const hasFolders = files.filter((x) => x.IsDir).length > 0;

  event.reply("check_folder", {
    success: true,
    value: { path: args.path, apk: apkFiles[0], hasObb: hasFolders, totalSize },
  });
}

function cleanUpFoldername(simpleName) {
  simpleName = simpleName.split("-QuestUnderground")[0];
  simpleName = simpleName.split(/v[0-9]*\./)[0];
  //simpleName = simpleName.split(/v[0-9][0-9]\./)[0]
  //simpleName = simpleName.split(/v[0-9][0-9][0-9]\./)[0]
  simpleName = simpleName.split(/\[[0-9]*\./)[0];
  simpleName = simpleName.split(/\[[0-9]*\]/)[0];
  simpleName = simpleName.trim();

  return simpleName;
}

async function getInstalledAppsFromDevice(event) {
  event.reply("get_installed_apps", {
    success: true,
    value: await getInstalledApps(true),
  });
}
