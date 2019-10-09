const paths = require("./paths");

module.exports = function (webpackEnv) {
  return {
    mode: webpackEnv,
    entry: "./src/electronMain.js",
    output: {
      filename: "electronMain.js",
      path: paths.appBuild
    },
    module: {
      rules: [
        {
          test: /(^electron)(.*)(js|mjs|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: "babel-loader"
        }
      ]
    },
    node: {
      __dirname: false,
      __filename: false
    },
    target: "electron-main"
  }
}

