# Integrating PIKD into your React Native app

Use this example to add PIKD to your app through a launch button. Your app supplies the signed-in user, configuration, branding and device adapters. The SDK presents the experience and returns control when the user closes it.

## Choose the integration

| Package | Use it for |
|---|---|
| `@eleostechorg/pikd-react-native-core` | API calls for authentication, campaigns, collectibles, profiles and leaderboards |
| `@eleostechorg/pikd-react-native-ui` | Individual prebuilt screens and components within your navigation |
| `@eleostechorg/pikd-react-native-ar` | Native AR views and session integration |
| `@eleostechorg/pikd-react-native-experience` | A complete experience composed from SDK screens |
| `@eleostechorg/pikd-react-native-partner-experience` | A branded campaign experience, including the CDA trail entry used in this app |

Use the same exact version for all PIKD packages. The example's [package.json](../package.json) lists the SDK and native dependencies used by this app. The corresponding package READMEs on npm describe individual entry points.

## Set up native dependencies

Install the packages for your integration and complete their native setup. Use the example's [Android project](../android) and [iOS project](../ios) as references, adapting identifiers to your app.

- **Android:** configure Google/Maven Central repositories, Maps, camera/location permissions, fonts and keyboard resize. This example uses minSdk 24, compileSdk 36 and targetSdk 35.
- **iOS:** configure Maps initialization, camera/location usage descriptions, permission handlers, fonts and signing. This example targets iOS 15.1.
- **Glass controls:** install `@callstack/liquid-glass@0.7.0` with React Native 0.80+ and Xcode 26+.
- **URL support:** import `react-native-url-polyfill/auto` before SDK imports, as shown in [index.js](../index.js).
- **Session IDs:** install `react-native-get-random-values@1.11.0` for the full experience.

Run CocoaPods after installing native dependencies:

```sh
bundle install
bundle exec pod install --project-directory=ios
```

Rebuild your native app after installation. Use a physical AR-capable device for camera collection.

## Configure the launch

The CDA trail entry is `PikdCdaExperience`. Supply `PikdCdaExperienceConfiguration` from your app:

```tsx
import type { PikdCdaExperienceConfiguration } from '@eleostechorg/pikd-react-native-partner-experience';

const configuration: PikdCdaExperienceConfiguration = {
  baseUrl: sdkV1BaseUrl,
  sdkKey: tenantSdkKey,
  userRef: signedInUser.id,
  email: signedInUser.email,
  locale: 'en',
  contentLanguageRef: 'en',
  branding: {
    itemBrand: brandName,
    appName: appName,
  },
  theme: appPikdTheme,
  locationProvider: appLocationProvider,
  arPermissions: appArPermissions,
};
```

Replace the named values with your app's configuration and adapters. Keep the configuration object stable while the experience is open. Create a fresh configuration when opening a new session or switching accounts.

| Setting | Supply |
|---|---|
| `baseUrl`, `sdkKey` | Your tenant's PIKD SDK v1 access details |
| `userRef` | A stable identifier for the signed-in user in your app |
| `email` | Optional email from that account |
| `locale` | Interface language: `en`, `ru` or `kk` |
| `contentLanguageRef` | Campaign content language |
| `branding`, `theme` | App/item names, colors and registered font choices |
| `locationProvider` | Device location adapter |
| `arPermissions` | Camera/location permission and settings adapter |

For adapter implementations, see [src/device-adapters.ts](../src/device-adapters.ts). Connect these interfaces to your app's location and permission providers.

The CDA entry exchanges identity for a PIKD session before opening the campaign. Session credentials stay scoped to that launch. Keep your host user identity current when users sign in, sign out or switch accounts.

## Open and close the experience

Present the component in a full-screen route or modal. The following example assumes your app already has a `SafeAreaProvider`:

```tsx
import { useRef } from 'react';
import { Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PikdExperienceHandle } from '@eleostechorg/pikd-react-native-experience/native';
import type { PikdCdaExperienceConfiguration } from '@eleostechorg/pikd-react-native-partner-experience';
import { PikdCdaExperience } from '@eleostechorg/pikd-react-native-partner-experience/cda-native';

export function TrailRoute({ configuration, onClose }: {
  configuration: PikdCdaExperienceConfiguration;
  onClose: () => void;
}) {
  const experience = useRef<PikdExperienceHandle>(null);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible onRequestClose={() => experience.current?.handleBack()}>
      <PikdCdaExperience
        ref={experience}
        configuration={configuration}
        safeAreaInsets={insets}
        onClose={onClose}
        onLaunchError={onClose}
      />
    </Modal>
  );
}
```

Open this route from your app's button and unmount it when `onClose` runs. Route back actions through `handleBack()` so the SDK can close nested screens and finish AR cleanup. Supply your own `onLaunchError` handler to show an error message before closing.

To prepare the session before navigating, follow [App.tsx](../App.tsx), which uses `prepareCdaExperience` and `PikdPreparedPartnerExperience`.

## Apply your branding

Create a theme using `createPikdTheme` and `withFontFamily` from the UI package. [src/theme.ts](../src/theme.ts) provides an example of semantic colors, gradients and typography. Pass the result as `theme` alongside `branding`.

Register fonts in Android assets and iOS resources/`UIAppFonts`. Include Poppins Regular/Medium for the control styling, or configure your registered font through the theme. Keep the accompanying font licenses. The example includes the required font registrations.

Use `presentation` for labels and instructions, and `stringOverrides` for localized text. Supply a new configuration when changing branding for a new launch.

## Collection and profile

The SDK opens the tenant's active campaign. Users browse the map, select an object and collect it in AR. Your location adapter supplies device coordinates at collection time; PIKD applies campaign rules and returns the result message.

Profile contains Dashboard and Collectibles tabs. The leaderboard displays participant rank, best time and completed trails. Collection updates refresh these views.

For optional host nicknames, supply `nickName` in the launch configuration. Keep `userRef` as the stable account identifier.

## Engagement and logging

The experience reports foreground engagement while open. Set `reportEngagement: false` in launch configuration to disable it according to your app's consent settings.

For troubleshooting the example, use the [platform runners and logs](LOCAL_SETUP.md#logs-and-runner-options). Review logs before attaching them to support requests.

## License

PIKD SDK use requires a written agreement with ELEOS WORLD LTD. See [LICENSE](../LICENSE) and retain the [third-party notices](../ASSETS.md) when reusing bundled assets.
