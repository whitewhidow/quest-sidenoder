export function formatBytes(bytes) {
  var sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 B";
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

export function formatEta(seconds) {
  if (seconds == null) {
    return "Starting...";
  }
  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  if (hours > 0) {
    return hours + "h " + minutes + "m " + seconds + "s";
  } else if (minutes > 0) {
    return minutes + "m " + seconds + "s";
  } else {
    return seconds + "s";
  }
}
