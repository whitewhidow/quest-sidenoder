const isDevelopment = process.env.NODE_ENV !== "production";
// const prodLogLevel = 2;

export class Logger {
  constructor(tag) {
    this.tag = tag;
  }

  log() {
    if (isDevelopment) {
      console.log("[" + this.tag + "]", ...arguments);
    }
  }

  debug() {
    if (isDevelopment) {
      console.debug("[" + this.tag + "]", ...arguments);
    }
  }

  info() {
    if (isDevelopment) {
      console.info("[" + this.tag + "]", ...arguments);
    }
  }

  warn() {
    console.warn("[" + this.tag + "]", ...arguments);
  }

  error() {
    console.error("[" + this.tag + "]", ...arguments);
  }
}
