import globals from "../electron/globals";

/**
 * Send information as a reply to a event or to webContents
 * @param {*} event
 * @param {*} channel
 * @param {*} data
 */
export function reply(event, channel, data) {
  if (event) {
    event.reply(channel, data);
  } else {
    globals.win.webContents.send(channel, data);
  }
}
