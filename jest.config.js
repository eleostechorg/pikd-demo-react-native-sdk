module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-url-polyfill)/)',
  ],
  testMatch: ['<rootDir>/test/*.test.tsx'],
  testTimeout: 15000,
  setupFilesAfterEnv: ['<rootDir>/test/setup.cjs'],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime',
    '^react-native$': '<rootDir>/node_modules/react-native',
  },
};
