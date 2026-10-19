/**
 * @format
 */

import 'react-native-url-polyfill/auto';

import { AppRegistry } from 'react-native';
import App from './App';
import Geolocation from '@react-native-community/geolocation';
import { name as appName } from './app.json';

// Community geolocation 3.4.0's Play Services one-shot callback can remove a
// null listener on overlapping fixes. Use Android's GPS/network providers,
// as the consumer app does by default; permissions remain host-owned.
Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  locationProvider: 'android',
});

AppRegistry.registerComponent(appName, () => App);
