# Local setup

Follow these steps from the repository root to run the example on an Android device or iPhone.

## Prerequisites

The example uses React Native 0.80.2, React 19.1, Hermes and New Architecture.

| Platform | Install |
|---|---|
| Both | Node 22, npm 11 and access to a PIKD tenant with one active campaign |
| Android | Android Studio, JDK 17, SDK platform 36, build-tools 35.0.0, NDK 27.1.12297006 and platform-tools |
| iOS | macOS, Xcode 26+, its command-line tools, Ruby 3.3+, Bundler and an Apple development account |

Use an AR-capable physical device for camera collection. For iPhone device logging, install [libimobiledevice](https://github.com/libimobiledevice/libimobiledevice):

```sh
brew install libimobiledevice
```

Set `ANDROID_HOME` to your Android SDK directory, or create `android/local.properties` with `sdk.dir=/path/to/your/android/sdk`. Confirm `adb` is on your PATH.

For iOS, accept Xcode's license and install its platform support. Use your installed Ruby rather than Apple's system Ruby. Verify `ruby -v`; install Bundler with `gem install bundler` if needed.

The platform runners use Bash: run them on macOS, or Linux for Android. On Windows, use the [manual commands](#manual-launch) with your native toolchain.

## Install and configure

```sh
npm ci --ignore-scripts
cp config/pikd.example.json config/pikd.local.json
```

Fill the following fields in `config/pikd.local.json`:

| Field | Description |
|---|---|
| `PIKD_BASE` | Your PIKD SDK v1 base URL |
| `PIKD_SDK_KEY` | Your tenant's SDK key |
| `PIKD_USER` | Stable identifier for the user in your app |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Android Maps key |
| `GOOGLE_MAPS_IOS_API_KEY` | iOS Maps key |

PIKD supplies the tenant access details. Campaign locations and content are managed for that tenant.

Run `npm run prepare:config` after editing the JSON, or restart the platform runner. Generated runtime and Maps files stay ignored by Git. To use a configuration file elsewhere, set `PIKD_DEMO_CONFIG` to its path.

## Android

1. Enable USB debugging, connect and unlock your device, then accept the authorization prompt.
2. Check the connection:

   ```sh
   adb devices -l
   ```

3. Enable Maps SDK for Android and restrict your key to application ID `com.pikdexperiencedemo` and the signing certificate used for your build.
4. Run:

   ```sh
   npm run run:android
   # Select a device when more than one is connected:
   PIKD_DEVICE_ID=YOUR_ANDROID_SERIAL npm run run:android
   ```

The runner builds and installs the app and forwards the Metro port over USB.

If you prefer a native Maps key file, copy `android/keys.properties.example` to `android/keys.properties` and fill `MAPS_API_KEY`. A Maps key supplied through the environment takes precedence, followed by local JSON, the native file and user Gradle properties.

## iOS

1. Create your local signing file:

   ```sh
   cp ios/Config/Local.xcconfig.example ios/Config/Local.xcconfig
   ```

2. Set `DEVELOPMENT_TEAM` to your Apple team ID. Supply the Maps key through local JSON or `PIKD_GOOGLE_MAPS_API_KEY` in this file; an explicit native-file key takes precedence.
3. Enable Maps SDK for iOS and restrict the key to bundle ID `org.reactjs.native.example.PikdExperienceDemo`.
4. Pair and trust the iPhone, unlock it and enable Developer Mode. List its UDID:

   ```sh
   idevice_id -l
   ```

5. Run:

   ```sh
   PIKD_DEVICE_ID=YOUR_IPHONE_UDID npm run run:ios
   ```

The runner installs Ruby gems and CocoaPods, builds the app, installs it and starts device logging. For provisioning changes, open `ios/PikdExperienceDemo.xcworkspace` in Xcode after pod installation and select your development team.

The signing file, device-specific environment and generated settings remain local.

## Configuration and branding

Add optional settings to `config/pikd.local.json`:

| Field | Purpose |
|---|---|
| `PIKD_EMAIL` | Email from the host account |
| `PIKD_UI_LOCALE` | Initial interface language: `en`, `ru` or `kk` |
| `PIKD_LANGUAGE_REF` | Tenant content language; defaults to the selected interface language |
| `PIKD_PARTNER_LABEL` | Partner name on the entry page |
| `PIKD_PARTNER_ITEM_BRAND` | Brand name used in item instructions |
| `PIKD_PARTNER_APP_NAME` | Host app name used in presentation |
| `PIKD_FONT_FAMILY` | Registered font family |
| `PIKD_THEME` | SDK theme overrides |

For example, merge these optional values into your local JSON:

```json
{
  "PIKD_PARTNER_LABEL": "Your brand",
  "PIKD_PARTNER_ITEM_BRAND": "Your brand",
  "PIKD_PARTNER_APP_NAME": "Your app",
  "PIKD_FONT_FAMILY": "Manrope",
  "PIKD_THEME": {
    "colors": {
      "primary": "#146B73",
      "onPrimary": "#FFFFFF",
      "primaryGradient": ["#146B73", "#11545B"]
    }
  }
}
```

The demo includes Manrope and Poppins. Register any additional fonts on both platforms before selecting their family name. Preserve the font licenses when using bundled assets.

English is the initial interface language. Select a tenant content language available for your campaign. An optional nickname can be entered before opening the experience and edited when returning to the entry page.

## Logs and runner options

Keep the runner terminal open while using the app. Press Ctrl+C when finished. Logs are written to `logs/<platform>-debug-<timestamp>-<pid>.log`.

For additional SDK diagnostics:

```sh
PIKD_DIAGNOSTICS=1 PIKD_DEVICE_ID=YOUR_IPHONE_UDID npm run run:ios
# Or:
PIKD_DIAGNOSTICS=1 npm run run:android
```

If the runner reuses an existing Metro process, JavaScript output stays in that process's terminal. Stop it before running the demo if you want one combined log. Review logs before sharing them.

| Environment variable | Purpose |
|---|---|
| `PIKD_DEVICE_ID` | Android serial or iPhone UDID |
| `PIKD_DEMO_CONFIG` | Local tenant JSON path |
| `PIKD_DIAGNOSTICS=1` | Enable SDK debug events |
| `PIKD_LOG_DIR` | Choose the log directory |
| `RCT_METRO_PORT` | Choose the Metro port |
| `PIKD_SKIP_INSTALL=1` | Skip dependency and pod setup after a successful installation |
| `PIKD_CLEAN=1` | Clean Android build output/reset newly started Metro; reinstall pods on iOS |

You can keep machine defaults in ignored `scripts/local-env.sh`, using `scripts/local-env.sh.example` as a starting point.

## Manual launch

Prepare configuration, then start Metro in one terminal:

```sh
npm run prepare:config
npm start
```

In another terminal, run Android:

```sh
npm run android
```

For iOS, install pods before launching:

```sh
bundle install
bundle exec pod install --project-directory=ios
npm run ios
# Choose a simulator if needed:
npm run ios -- --simulator "YOUR_SIMULATOR"
```

Use the platform runners for combined setup, build and device logs.

## Troubleshooting

| Symptom | Action |
|---|---|
| Configuration required | Fill `PIKD_BASE`, `PIKD_SDK_KEY` and `PIKD_USER`; check any custom configuration path. |
| Campaign launch error | Confirm tenant access and that the tenant has one active campaign. |
| Blank map | Check the platform Maps SDK, key restrictions, application/bundle ID and Android signing certificate. |
| Map has no objects | Search around your tenant's campaign locations. The map search covers up to 5 km. |
| Location unavailable | Enable device location services and grant the app location permission. |
| Collect button unavailable | Move within collection range and select the object. The default UI radius is 5 m. |
| Android build or device error | Check JDK/SDK/NDK versions, SDK path, USB authorization and `adb devices -l`. |
| iPhone not found | Confirm UDID, trust, pairing, Developer Mode and Xcode device visibility. |
| iOS signing error | Check `DEVELOPMENT_TEAM`, Apple account and provisioning for the bundle ID. |
| CocoaPods error | Check Ruby/Bundler versions; run `bundle install` and `bundle exec pod install --project-directory=ios`. |
| App cannot load JavaScript | Restart the runner and keep its terminal open; confirm Metro serves this project. |
| Metro port already in use | Stop the other Metro process or set `RCT_METRO_PORT`. |
| iPhone logs missing | Check libimobiledevice installation, pairing and that the phone is unlocked. |

For further help, contact your PIKD representative or open a demo issue with the platform, tool versions, reproduction steps and a redacted log excerpt.
