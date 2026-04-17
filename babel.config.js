module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": "./src"
          }
        }
      ],
      // Must stay last — https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/#step-2-add-reanimateds-babel-plugin
      "react-native-reanimated/plugin"
    ]
  };
};

