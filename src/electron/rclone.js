import fetch from "node-fetch";
import settings from "electron-settings";

export async function check() {
  try {
    const resp = await fetch("http://127.0.0.1:5572/rc/noop", {
      method: "post",
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

export async function list(path, opt = null) {
  if (opt == null) opt = {};
  const body = {
    fs: settings.getSync("rclone.mirror") + ":",
    remote: path,
    opt: opt,
  };
  const list = await fetch("http://127.0.0.1:5572/operations/list", {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
    .then((resp) => resp.json())
    .then((resp) => resp.list);

  return list;
}

export async function copyfile(src, dst) {
  const body = {
    srcFs: settings.getSync("rclone.mirror") + ":",
    srcRemote: src,
    dstFs: "/",
    dstRemote: dst,
    _async: true,
  };

  const resp = await fetch("http://127.0.0.1:5572/operations/copyfile", {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
    .then((resp) => resp.json())
    .then((resp) => {
      return resp.jobid;
    });
  return resp;
}

export async function copy(src, dst) {
  const body = {
    srcFs: settings.getSync("rclone.mirror") + ":" + src,
    dstFs: dst,
    _async: true,
  };

  const resp = await fetch("http://127.0.0.1:5572/sync/copy", {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
    .then((resp) => resp.json())
    .then((resp) => {
      return resp.jobid;
    });
  return resp;
}

export async function waitForJob(jobid, cb, seen = false) {
  return new Promise((resolve) => {
    fetch("http://127.0.0.1:5572/core/stats?group=job/" + jobid, {
      method: "post",
    })
      .then((resp) => resp.json())
      .then((resp) => {
        if (!seen || (resp.transferring && resp.transferring.length > 0)) {
          if (resp.transferring && resp.transferring.length > 0) {
            cb(resp.transferring[0]);
          }
          // Delay promise
          setTimeout(() => {
            waitForJob(jobid, cb, true).then(() => {
              resolve(null);
            });
          }, 2000);
        } else {
          resolve(null);
        }
      });
  });
}
