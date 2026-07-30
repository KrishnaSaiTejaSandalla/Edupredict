const { getDefaultConfig } = require('expo/metro-config');

const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'src/components/maps/react-native-maps.web.tsx'),
      type: 'sourceFile',
    };
  }
  if (platform === 'web' && moduleName === 'expo-secure-store') {
    return {
      filePath: path.resolve(__dirname, 'src/shims/expo-secure-store.web.ts'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
