jest.mock('react-native-get-random-values', () => {
  global.crypto = require('node:crypto').webcrypto;
  return {};
});
global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-svg', () => ({ SvgXml: 'SvgXml' }));
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    setRNConfiguration: jest.fn(),
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(() => 9),
    clearWatch: jest.fn(),
  },
}));
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: { CAMERA: 'camera', LOCATION_WHEN_IN_USE: 'location' },
    ANDROID: {
      CAMERA: 'camera',
      ACCESS_FINE_LOCATION: 'fine',
      ACCESS_COARSE_LOCATION: 'coarse',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    LIMITED: 'limited',
  },
  checkMultiple: jest.fn(async () => ({ fine: 'granted', coarse: 'granted' })),
  requestMultiple: jest.fn(async () => ({
    fine: 'granted',
    coarse: 'granted',
  })),
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
  openSettings: jest.fn(async () => {}),
}));

jest.mock('@callstack/liquid-glass', () => ({
  LiquidGlassView: 'LiquidGlassView',
  isLiquidGlassSupported: false,
}));
