const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = function (options) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      extensions: [".ts", ".js", ".json"],
    },
    module: {
      ...options.module,
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
                configFile: path.resolve(__dirname, "tsconfig.build.json"),
              },
            },
          ],
          exclude: /node_modules\/(?!@discord-clone)/,
        },
      ],
    },
    externals: [
      nodeExternals({
        allowlist: [/^@discord-clone/],
        modulesDir: path.resolve(__dirname, "../../node_modules"),
      }),
      nodeExternals({
        allowlist: [/^@discord-clone/],
      }),
    ],
  };
};
