import {
  mkdirSync,
  statSync,
  existsSync,
  readdirSync,
  lstatSync,
  unlinkSync,
  rmdirSync,
} from "fs";
import path from "path";
import { tmpdir } from "os";

export function workdir() {
  return path.join(tmpdir(), "sideload-dl");
}

export function mkdirsSync(p, opts, made) {
  if (!made) made = null;

  p = path.resolve(p);

  try {
    mkdirSync(p);
    made = made || p;
  } catch (err0) {
    switch (err0.code) {
      case "ENOENT":
        made = mkdirsSync(path.dirname(p), opts, made);
        mkdirsSync(p, opts, made);
        break;

      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.
      default:
        var stat;
        try {
          stat = statSync(p);
        } catch (err1) {
          throw err0;
        }
        if (!stat.isDirectory()) throw err0;
        break;
    }
  }

  return made;
}

export function deleteFolderRecursive(folder) {
  if (existsSync(folder)) {
    readdirSync(folder).forEach((file) => {
      const curPath = path.join(folder, file);
      if (lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        unlinkSync(curPath);
      }
    });
    rmdirSync(folder);
  }
}

export async function getFiles(dir) {
  const dirents = readdirSync(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}
