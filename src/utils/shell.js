import { exec } from "child_process";
import { Logger } from "./logger";

const logger = new Logger("Shell");

export function execShellCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        logger.warn('error in "' + cmd + '"', error);
        reject(error);
        return;
      }
      if (stdout) {
        resolve(stdout);
      } else {
        logger.warn('stderr in "' + cmd + '"', error);
        reject(stderr);
      }
    });
  });
}
