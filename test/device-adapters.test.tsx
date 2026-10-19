import Geolocation from '@react-native-community/geolocation';
import { Platform } from 'react-native';
import {
  check,
  request,
  requestMultiple,
  PERMISSIONS,
} from 'react-native-permissions';
import { createDeviceAdapters } from '../src/device-adapters';
beforeEach(() => jest.clearAllMocks());
test('GPS timeout retries a real balanced fix; failure does not synthesize coordinates', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const adapter = createDeviceAdapters();
    const pending = adapter.locationProvider.getCurrentLocation();
    const calls = jest.mocked(Geolocation.getCurrentPosition).mock.calls;
    calls[0][1]!({
      code: 3,
      message: 'private device detail',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });
    expect(calls[1][2]).toMatchObject({
      enableHighAccuracy: false,
      maximumAge: 30000,
    });
    calls[1][0]({
      coords: {
        latitude: 3,
        longitude: 4,
        altitude: null,
        accuracy: 20,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 1,
    });
    expect(await pending).toEqual({ latitude: 3, longitude: 4, accuracy: 20 });
    expect(warning).toHaveBeenCalledWith('[PIKD demo] location fix failed', {
      code: 3,
      highAccuracy: true,
    });
    const failed = adapter.locationProvider.getCurrentLocation();
    calls[2][1]!({
      code: 2,
      message: 'private',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });
    calls[3][1]!({
      code: 2,
      message: 'private',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });
    expect(await failed).toBeNull();
  } finally {
    warning.mockRestore();
  }
});

test('canceling a pending balanced retry suppresses late success and cache writes', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const adapter = createDeviceAdapters(),
      controller = new AbortController();
    const pending = adapter.locationProvider.getCurrentLocation({
      signal: controller.signal,
    });
    const calls = jest.mocked(Geolocation.getCurrentPosition).mock.calls;
    calls[0][1]!({
      code: 3,
      message: 'private',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    calls[1][0]({
      coords: {
        latitude: 3,
        longitude: 4,
        altitude: null,
        accuracy: 20,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 1,
    });
    expect(await adapter.locationProvider.getLastKnownLocation!()).toBeNull();
  } finally {
    warning.mockRestore();
  }
});
test('real measured position is scoped, cached only after success and ignores canceled late callbacks', async () => {
  const first = createDeviceAdapters(),
    second = createDeviceAdapters();
  expect(await first.locationProvider.getLastKnownLocation!()).toBeNull();
  const abort = new AbortController();
  const pending = first.locationProvider.getCurrentLocation({
    signal: abort.signal,
  });
  const callback = jest.mocked(Geolocation.getCurrentPosition).mock.calls[0][0];
  abort.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  callback({
    coords: {
      latitude: 1,
      longitude: 2,
      altitude: null,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1,
  });
  expect(await first.locationProvider.getLastKnownLocation!()).toBeNull();
  const real = first.locationProvider.getCurrentLocation();
  jest.mocked(Geolocation.getCurrentPosition).mock.calls[1][0]({
    coords: {
      latitude: 3,
      longitude: 4,
      altitude: null,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 2,
  });
  expect(await real).toEqual({ latitude: 3, longitude: 4, accuracy: 5 });
  expect(await second.locationProvider.getLastKnownLocation!()).toBeNull();
});
test('permission adapters map denial/blocking and require camera plus location for AR', async () => {
  const adapters = createDeviceAdapters();
  jest.mocked(check).mockResolvedValueOnce('denied');
  expect(await adapters.locationProvider.checkPermission()).toBe('requestable');
  jest.mocked(request).mockResolvedValueOnce('blocked');
  expect(await adapters.locationProvider.requestPermission()).toBe('blocked');
  jest
    .mocked(request)
    .mockResolvedValueOnce('granted')
    .mockResolvedValueOnce('denied');
  expect(await adapters.arPermissions.request()).toBe(false);
});
test('watch disposer stops real native watch and suppresses late callbacks', () => {
  const adapters = createDeviceAdapters(),
    listener = jest.fn();
  const stop = adapters.locationProvider.subscribeLocation!(listener),
    callback = jest.mocked(Geolocation.watchPosition).mock.calls[0][0];
  stop();
  expect(Geolocation.clearWatch).toHaveBeenCalledWith(9);
  callback({
    coords: {
      latitude: 1,
      longitude: 2,
      altitude: null,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1,
  });
  expect(listener).not.toHaveBeenCalled();
});

test('Android requests fine and coarse together, accepts approximate location and suppresses canceled permission completion', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'android');
  try {
    const adapters = createDeviceAdapters();
    jest.mocked(requestMultiple).mockResolvedValueOnce({
      [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]: 'denied',
      [PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION]: 'granted',
    } as Awaited<ReturnType<typeof requestMultiple>>);
    expect(await adapters.locationProvider.requestPermission()).toBe('granted');
    expect(requestMultiple).toHaveBeenCalledWith(['fine', 'coarse']);
    const controller = new AbortController();
    const pending = adapters.locationProvider.requestPermission({
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  } finally {
    platform.restore();
  }
});
