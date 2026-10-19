# PIKD React Native demo

An example app for integrating PIKD into a React Native app. Explore a campaign map, collect AR objects, view your collection and follow the leaderboard. This example uses the CDA trail experience with configurable branding.

The app installs PIKD SDK packages from npm. You need PIKD tenant access and Google Maps keys to run it.

## Get started

1. Install Node 22 and npm 11, then follow the [platform prerequisites](docs/LOCAL_SETUP.md#prerequisites) for Android or iOS.
2. Clone the repository and install its dependencies:

   ```sh
   git clone https://github.com/eleostechorg/pikd-demo-react-native-sdk.git
   cd pikd-demo-react-native-sdk
   npm ci --ignore-scripts
   cp config/pikd.example.json config/pikd.local.json
   ```

3. Edit `config/pikd.local.json`:

   | Setting | Value |
   |---|---|
   | `PIKD_BASE` | SDK v1 base URL supplied by PIKD |
   | `PIKD_SDK_KEY` | Your tenant's SDK key |
   | `PIKD_USER` | A stable user identifier from your app |
   | `GOOGLE_MAPS_ANDROID_API_KEY` | Maps key for Android, if testing Android |
   | `GOOGLE_MAPS_IOS_API_KEY` | Maps key for iOS, if testing iOS |

4. Complete [Android device setup](docs/LOCAL_SETUP.md#android) or [iPhone signing and device setup](docs/LOCAL_SETUP.md#ios), then run:

   ```sh
   # Android: with one device connected
   npm run run:android

   # iPhone: use the UDID reported by idevice_id -l
   PIKD_DEVICE_ID=YOUR_IPHONE_UDID npm run run:ios
   ```

The runner prepares configuration, installs native dependencies, starts Metro and installs the app. Keep its terminal open while testing. Build and device output is saved under `logs/`.

Local keys, signing settings, generated configuration and logs are Git-ignored. Keep your populated configuration files local.

## Try the app

Choose a language and tap **Open PIKD**. The app opens your tenant's active campaign:

- **Map:** browse locations and select an object to collect.
- **Info:** read campaign details and instructions.
- **AR:** view and collect objects using the camera.
- **Leaderboard:** see participant ranks, best times and completed trails.
- **Profile:** view the activity Dashboard and your Collectibles, including **View in AR**.

Collection uses your device location and the campaign's collection rules. Search around locations configured for your tenant. Collection results display messages returned by PIKD.

## Customize the example

Set partner names, colors, fonts and language in your local configuration. See [configuration and branding](docs/LOCAL_SETUP.md#configuration-and-branding).

To add PIKD to your own app, follow [Integrating PIKD](docs/INTEGRATING_INTO_EXISTING_APP.md). It covers package selection, account identity, launch configuration, permissions and theming.

## Development commands

Run from the repository root:

```sh
npm run prepare:config
npm run typecheck
npm run lint
npm test
npm run test:runners
npm run bundle:ios
npm run bundle:android
```

For device selection, logging and build troubleshooting, see [Local setup](docs/LOCAL_SETUP.md).

## License and support

PIKD SDK use requires a written agreement with ELEOS WORLD LTD. See [LICENSE](LICENSE) and preserve the [asset and third-party notices](ASSETS.md).

For setup or integration questions, contact your PIKD representative. Report reproducible demo issues through [GitHub Issues](https://github.com/eleostechorg/pikd-demo-react-native-sdk/issues); remove credentials and personal data from attachments.
