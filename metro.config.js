const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  maxWorkers: 2,
  resolver: {
    useWatchman: false,
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['require', 'react-native'],
  },
});
