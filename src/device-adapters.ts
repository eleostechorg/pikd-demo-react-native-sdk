import Geolocation from '@react-native-community/geolocation';
import { Platform } from 'react-native';
import {
  check,
  request,
  checkMultiple,
  requestMultiple,
  openSettings,
  PERMISSIONS,
  RESULTS,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';
import type {
  ExploreLocationProvider,
  ExploreLatLng,
  LocationPermissionStatus,
} from '@eleostechorg/pikd-react-native-ui';
import type { PikdArPermissions } from '@eleostechorg/pikd-react-native-experience';
const androidLocationPermissions = [
  PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
];
async function locationPermissionStatus(asking: boolean) {
  if (Platform.OS === 'ios')
    return permission(
      await (asking ? request : check)(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE),
    );
  // Android 12 requires fine and coarse in the same request. Approximate GPS is still real GPS.
  const statuses = await (asking ? requestMultiple : checkMultiple)(
    androidLocationPermissions,
  );
  const fine = permission(statuses[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]);
  const coarse = permission(
    statuses[PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION],
  );
  return fine === 'granted' || coarse === 'granted'
    ? 'granted'
    : fine === 'requestable' || coarse === 'requestable'
      ? 'requestable'
      : 'blocked';
}
const cameraPermission: Permission =
  Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
function permission(status: PermissionStatus): LocationPermissionStatus {
  return status === RESULTS.GRANTED || status === RESULTS.LIMITED
    ? 'granted'
    : status === RESULTS.DENIED
      ? 'requestable'
      : 'blocked';
}
function aborted(signal?: AbortSignal) {
  if (signal?.aborted)
    throw Object.assign(new Error('Canceled'), { name: 'AbortError' });
}
/** Construct per launch. Never synthesize GPS, and never keep a user/global position store. */
export function createDeviceAdapters() {
  let lastKnown: (ExploreLatLng & { accuracy?: number }) | null = null;
  const locationProvider: ExploreLocationProvider = {
    async checkPermission({ signal } = {}) {
      aborted(signal);
      const status = await locationPermissionStatus(false);
      aborted(signal);
      return status;
    },
    async requestPermission({ signal } = {}) {
      aborted(signal);
      const status = await locationPermissionStatus(true);
      aborted(signal);
      return status;
    },
    async getLastKnownLocation({ signal } = {}) {
      aborted(signal);
      return lastKnown;
    },
    async getCurrentLocation({ signal } = {}) {
      aborted(signal);
      return new Promise((resolve, reject) => {
        const cancel = () => {
          signal?.removeEventListener('abort', cancel);
          reject(Object.assign(new Error('Canceled'), { name: 'AbortError' }));
        };
        signal?.addEventListener('abort', cancel, { once: true });
        let finished = false;
        const read = (highAccuracy: boolean) => {
          Geolocation.getCurrentPosition(
            position => {
              if (finished || signal?.aborted) return;
              finished = true;
              signal?.removeEventListener('abort', cancel);
              lastKnown = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                ...(typeof position.coords.accuracy === 'number'
                  ? { accuracy: position.coords.accuracy }
                  : {}),
              };
              resolve(lastKnown);
            },
            failure => {
              if (finished || signal?.aborted) return;
              console.warn('[PIKD demo] location fix failed', {
                code: failure.code,
                highAccuracy,
              });
              // Permission failure cannot be repaired by a second provider request.
              // Retry timeouts/unavailable GPS with a real balanced/network fix.
              if (highAccuracy && failure.code !== 1) {
                read(false);
                return;
              }
              finished = true;
              signal?.removeEventListener('abort', cancel);
              resolve(null);
            },
            {
              enableHighAccuracy: highAccuracy,
              timeout: 15000,
              maximumAge: highAccuracy ? 0 : 30000,
            },
          );
        };
        read(true);
      });
    },
    subscribeLocation(listener) {
      let active = true;
      const watch = Geolocation.watchPosition(
        position => {
          if (!active) return;
          lastKnown = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            ...(typeof position.coords.accuracy === 'number'
              ? { accuracy: position.coords.accuracy }
              : {}),
          };
          listener(lastKnown);
        },
        () => {},
        { enableHighAccuracy: Platform.OS !== 'android', distanceFilter: 2 },
      );
      return () => {
        active = false;
        Geolocation.clearWatch(watch);
      };
    },
    openAppSettings: () => openSettings('application'),
  };
  const arPermissions: PikdArPermissions = {
    async request({ signal } = {}) {
      aborted(signal);
      const camera = permission(await request(cameraPermission));
      aborted(signal);
      const location = await locationProvider.requestPermission({ signal });
      return camera === 'granted' && location === 'granted';
    },
    openSettings: () => openSettings('application'),
  };
  return { locationProvider, arPermissions };
}
