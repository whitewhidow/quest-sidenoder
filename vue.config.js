const webpack = require("webpack");
const fs = require("fs");
const packageJson = fs.readFileSync("./package.json");
const version = JSON.parse(packageJson).version || 0;

module.exports = {
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        "process.env": {
          PACKAGE_VERSION: '"' + version + '"',
        },
      }),
    ],
  },
  pluginOptions: {
    electronBuilder: {
      // Use this to change the entrypoint of your app's main process
      mainProcessFile: "src/electron/background.js",
      nodeIntegration: true,
      mainProcessWatch: ["src/electron/*.js"],

      builderOptions: {
        extraFiles: ["build/binaries/*"],
      },
    },
  },
};
