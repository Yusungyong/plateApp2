const path = require('path');
const { resolve } = require('metro-resolver');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native-maps' && platform === 'android') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(
            __dirname,
            'src/shims/react-native-maps/index.tsx',
          ),
        };
      }

      return resolve(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
