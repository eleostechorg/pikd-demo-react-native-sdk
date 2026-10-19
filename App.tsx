import { setPikdDiagnosticsEnabled } from '@eleostechorg/pikd-react-native-core';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  prepareCdaExperience,
  PikdPartnerLaunchError,
  type PikdCdaLaunch,
  type PikdCdaExperienceConfiguration,
} from '@eleostechorg/pikd-react-native-partner-experience';
import { PikdPreparedPartnerExperience } from '@eleostechorg/pikd-react-native-partner-experience/native';
import type { PikdExperienceHandle } from '@eleostechorg/pikd-react-native-experience/native';
import {
  PikdThemeProvider,
  type PikdLocale,
} from '@eleostechorg/pikd-react-native-ui';
import { PikdCdaProfile } from '@eleostechorg/pikd-react-native-partner-experience/cda-native';
import { PikdApiError } from '@eleostechorg/pikd-react-native-core';
import localValues from './config/runtime.generated.json';
import {
  branding,
  initialLocale,
  missingConfiguration,
  radiusMeters,
  type DemoValues,
} from './src/configuration';
import { demoTheme } from './src/theme';
import { demoStrings } from './src/strings';
import { createDeviceAdapters } from './src/device-adapters';
import { LanguageSelector } from './src/language-selector';
import { LaunchDialog } from './src/launch-dialog';
import { DemoIcon } from './src/icons';
export interface DemoAppProps {
  values?: DemoValues;
}
export default function App({ values = localValues }: DemoAppProps) {
  setPikdDiagnosticsEnabled(values.PIKD_DIAGNOSTICS === true);
  const identity = [values.PIKD_BASE, values.PIKD_SDK_KEY, values.PIKD_USER];
  const scope = useRef({ identity, generation: 0 });
  if (identity.some((value, index) => value !== scope.current.identity[index]))
    scope.current = { identity, generation: scope.current.generation + 1 };
  return (
    <SafeAreaProvider>
      <DemoHome key={scope.current.generation} values={values} />
    </SafeAreaProvider>
  );
}
function DemoHome({ values }: { values: DemoValues }) {
  const [locale, setLocale] = useState<PikdLocale>(() => initialLocale(values));
  const [opening, setOpening] = useState(false);
  const [nickName, setNickName] = useState('');
  const [route, setRoute] = useState<{
    launch: PikdCdaLaunch;
    configuration: PikdCdaExperienceConfiguration;
  } | null>(null);
  const [error, setError] = useState<{
    title: string;
    message: string;
    close: string;
  } | null>(null);
  const partner = branding(values),
    strings = demoStrings(locale, partner.label),
    missing = missingConfiguration(values);
  const theme = useMemo(
    () => demoTheme(partner.itemBrand, values),
    [partner.itemBrand, values],
  );
  const insets = useSafeAreaInsets(),
    experience = useRef<PikdExperienceHandle>(null);
  const pending = useRef(false),
    request = useRef<AbortController | null>(null),
    complete = useRef<(() => void) | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
      complete.current?.();
    };
  }, []);
  function close() {
    request.current?.abort();
    setRoute(null);
    setError(null);
    complete.current?.();
    complete.current = null;
  }
  async function open() {
    if (pending.current || missing.length) return;
    Keyboard.dismiss();
    pending.current = true;
    setOpening(true);
    const lifetime = new AbortController();
    request.current = lifetime;
    try {
      const configuration: PikdCdaExperienceConfiguration = {
        baseUrl: values.PIKD_BASE!,
        sdkKey: values.PIKD_SDK_KEY!,
        userRef: values.PIKD_USER!,
        email: values.PIKD_EMAIL?.trim() || undefined,
        nickName: nickName.trim() || undefined,
        locale,
        contentLanguageRef: values.PIKD_LANGUAGE_REF,
        collectRadiusMeters: radiusMeters(values),
        onArDiagnostic: event =>
          console.info('[PIKD demo] AR transition', event),
        theme,
        branding: partner,
        ...createDeviceAdapters(),
      };
      if (__DEV__)
        console.info('[PIKD demo] launch settings', {
          collectRadiusMeters: configuration.collectRadiusMeters,
        });
      if (__DEV__) console.info('[PIKD demo] CDA preflight started');
      const launch = await prepareCdaExperience(configuration, {
        signal: lifetime.signal,
      });
      if (!mounted.current || lifetime.signal.aborted) return;
      if (__DEV__)
        console.info('[PIKD demo] CDA preflight completed', {
          kind: launch.kind,
        });
      await new Promise<void>(resolve => {
        complete.current = resolve;
        setRoute({ launch, configuration });
      });
    } catch (failure) {
      if (!mounted.current || lifetime.signal.aborted) return;
      // Never log exception objects: request config can contain keys and user refs.
      console.warn('[PIKD demo] launch failed', {
        locale,
        category:
          failure instanceof PikdPartnerLaunchError
            ? failure.code
            : failure instanceof PikdApiError
              ? 'api'
              : failure instanceof TypeError
                ? 'configuration-or-runtime'
                : 'unexpected',
        status: failure instanceof PikdApiError ? failure.status : undefined,
      });
      const message =
        failure instanceof PikdPartnerLaunchError &&
        [
          'no-active-challenge',
          'multiple-active-challenges',
          'unnamed-active-challenge',
        ].includes(failure.code)
          ? strings.singleActiveChallengeRequired
          : strings.tryAgainLater;
      await new Promise<void>(resolve => {
        complete.current = resolve;
        setError({
          title: strings.experienceUnavailable,
          message,
          close: strings.close,
        });
      });
    } finally {
      pending.current = false;
      if (mounted.current) setOpening(false);
    }
  }
  const body = theme.typography.body,
    heading = theme.typography.headingL;
  return (
    <PikdThemeProvider theme={theme}>
      <View
        testID="demo-home"
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.background}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
          >
            <View style={{ width: '100%', maxWidth: 460 }}>
              <LanguageSelector
                locale={locale}
                label={strings.language}
                onChange={setLocale}
              />
              <View style={{ height: 16 }} />
              {missing.length ? (
                <View
                  testID="demo-missing-configuration"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.warning,
                    borderRadius: 24,
                    padding: 24,
                  }}
                >
                  <DemoIcon
                    name="settings"
                    color={theme.colors.warning}
                    size={32}
                  />
                  <Text
                    style={[
                      heading,
                      { color: theme.colors.textPrimary, marginTop: 16 },
                    ]}
                  >
                    {strings.configurationRequired}
                  </Text>
                  <Text
                    style={[
                      body,
                      { color: theme.colors.textSecondary, marginTop: 8 },
                    ]}
                  >
                    {strings.configurationDescription}
                  </Text>
                  <View style={{ marginTop: 12 }}>
                    {missing.map(value => (
                      <Text
                        key={value}
                        style={[
                          body,
                          { color: theme.colors.textPrimary, marginBottom: 4 },
                        ]}
                      >{`• ${value}`}</Text>
                    ))}
                  </View>
                </View>
              ) : (
                <View
                  testID="demo-launch-card"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 24,
                    padding: 28,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontFamily: theme.typography.fontFamily,
                      fontSize: 30,
                      fontWeight: '800',
                    }}
                  >
                    {partner.label}
                  </Text>
                  <Text
                    style={[
                      heading,
                      { color: theme.colors.textPrimary, marginTop: 20 },
                    ]}
                  >
                    {strings.welcomeTitle}
                  </Text>
                  <Text
                    style={[
                      body,
                      { color: theme.colors.textSecondary, marginTop: 8 },
                    ]}
                  >
                    {strings.experienceDescription}
                  </Text>
                  <Text
                    style={[
                      theme.typography.label,
                      {
                        color: theme.colors.textPrimary,
                        marginTop: theme.spacing.lg,
                      },
                    ]}
                  >
                    {strings.nicknameLabel}
                  </Text>
                  <TextInput
                    testID="demo-nickname"
                    accessibilityLabel={strings.nicknameLabel}
                    value={nickName}
                    onChangeText={setNickName}
                    editable={!opening}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="done"
                    placeholder={strings.nicknamePlaceholder}
                    placeholderTextColor={theme.colors.textMuted}
                    selectionColor={theme.colors.primary}
                    style={[
                      theme.typography.body,
                      {
                        color: theme.colors.textPrimary,
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        borderWidth: 1,
                        borderRadius: theme.shape.radiusMd,
                        padding: theme.spacing.md,
                        marginTop: theme.spacing.sm,
                      },
                    ]}
                  />
                  <Pressable
                    testID="demo-open-pikd"
                    accessibilityRole="button"
                    accessibilityLabel={strings.openPikd}
                    accessibilityState={{ disabled: opening, busy: opening }}
                    disabled={opening}
                    onPress={() => void open()}
                    style={{
                      marginTop: 28,
                      paddingVertical: 16,
                      borderRadius: 28,
                      backgroundColor: opening
                        ? theme.colors.surfaceVariant
                        : theme.colors.primary,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {opening ? (
                      <ActivityIndicator
                        testID="demo-opening"
                        color={theme.colors.primary}
                        style={{ width: 20, height: 20 }}
                      />
                    ) : (
                      <DemoIcon
                        name="explore"
                        color={theme.colors.onPrimary}
                        size={18}
                      />
                    )}
                    <Text
                      style={[
                        theme.typography.title,
                        {
                          color: opening
                            ? theme.colors.textMuted
                            : theme.colors.onPrimary,
                        },
                      ]}
                    >
                      {strings.openPikd}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
        {route &&
          (route.launch.kind === 'ready' ? (
            <Modal
              visible
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => experience.current?.handleBack()}
            >
              <PikdPreparedPartnerExperience
                ref={experience}
                launch={route.launch}
                configuration={route.configuration}
                onClose={close}
                safeAreaInsets={insets}
                renderProfile={context => (
                  <PikdCdaProfile
                    {...context}
                    locale={route.configuration.locale}
                  />
                )}
              />
            </Modal>
          ) : (
            <PikdPreparedPartnerExperience
              ref={experience}
              launch={route.launch}
              configuration={route.configuration}
              onClose={close}
              safeAreaInsets={insets}
            />
          ))}
        {error && <LaunchDialog {...error} onClose={close} />}
      </View>
    </PikdThemeProvider>
  );
}
