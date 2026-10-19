import { demoStrings } from '../src/strings';
/* eslint-disable @typescript-eslint/no-require-imports -- React is required inside the hoisted native facade mock. */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Modal, Pressable, Text, TextInput } from 'react-native';
import {
  prepareCdaExperience,
  PikdPartnerLaunchError,
} from '@eleostechorg/pikd-react-native-partner-experience';
import { PikdPreparedPartnerExperience } from '@eleostechorg/pikd-react-native-partner-experience/native';
import App from '../App';
import { initialLocale, radiusMeters } from '../src/configuration';
import { LanguageSelector } from '../src/language-selector';
import { PikdCdaProfile } from '@eleostechorg/pikd-react-native-partner-experience/cda-native';
import type { DemoValues } from '../src/configuration';
const mockBack = jest.fn();
jest.mock(
  '@eleostechorg/pikd-react-native-partner-experience/cda-native',
  () => {
    function PikdCdaProfile() {
      return null;
    }
    return { PikdCdaProfile };
  },
);
jest.mock('@eleostechorg/pikd-react-native-partner-experience', () => ({
  ...jest.requireActual('@eleostechorg/pikd-react-native-partner-experience'),
  prepareCdaExperience: jest.fn(),
}));
jest.mock('@eleostechorg/pikd-react-native-partner-experience/native', () => {
  const React: typeof import('react') = require('react');
  return {
    PikdPreparedPartnerExperience: React.forwardRef(
      (props: object, ref: React.Ref<unknown>) => {
        React.useImperativeHandle(ref, () => ({ handleBack: mockBack }));
        return React.createElement('PreparedSdkRoute', props);
      },
    ),
  };
});
const values = {
  PIKD_BASE: 'https://example.com/api/sdk/v1',
  PIKD_SDK_KEY: 'test',
  PIKD_USER: 'a',
  PIKD_PARTNER_LABEL: 'Partner club',
  PIKD_PARTNER_ITEM_BRAND: 'Partner',
  PIKD_PARTNER_APP_NAME: 'Host App',
};
let renderer: ReactTestRenderer;
const prepare = jest.mocked(prepareCdaExperience);
beforeEach(() => {
  jest.clearAllMocks();
  prepare.mockImplementation(async configuration => ({
    kind: 'ready',
    configuration: {
      ...configuration,
      contentLanguageRef: configuration.locale,
      campaign: { challengeId: 'c', title: 'Backend title' },
    },
  }));
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
});
async function mount(input: DemoValues = values) {
  await act(async () => {
    renderer = create(<App values={input} />);
  });
}
const texts = () =>
  renderer.root.findAllByType(Text).map(node => node.props.children);
const button = (id: string) =>
  renderer.root
    .findAllByType(Pressable)
    .find(node => node.props.testID === id)!;
async function open() {
  await act(async () => {
    button('demo-open-pikd').props.onPress();
  });
}
test('missing setup lists only required keys, keeps locale selector and never requests or shows launch', async () => {
  await mount({ ...values, PIKD_BASE: '', PIKD_SDK_KEY: '', PIKD_USER: '' });
  expect(texts()).toContain('• PIKD_BASE');
  expect(texts()).toContain('• PIKD_SDK_KEY');
  expect(texts()).toContain('• PIKD_USER');
  expect(button('demo-open-pikd')).toBeUndefined();
  expect(renderer.root.findAllByType(LanguageSelector)).toHaveLength(1);
  expect(prepare).not.toHaveBeenCalled();
});
test('launch card ports brand/palette/spacing and remains busy until the shared SDK closes', async () => {
  await mount();
  expect(texts()).toContain('Partner club');
  expect(texts()).toContain(
    "Welcome to Partner club's Interactive Christmas Trail!",
  );
  expect(texts()).not.toContain('Discover collectibles around you');
  expect(texts()).toContain('Open PIKD');
  const card = renderer.root.findAll(
    node => node.props.testID === 'demo-launch-card',
  )[0];
  expect(card.props.style).toMatchObject({
    padding: 28,
    borderRadius: 24,
    backgroundColor: '#1A1B1D',
  });
  await open();
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(button('demo-open-pikd').props.disabled).toBe(true);
  const props = renderer.root.findByType(PikdPreparedPartnerExperience).props;
  expect(props.configuration.collectRadiusMeters).toBe(5);
  expect(props.configuration.locale).toBe('en');
  expect(
    props.renderProfile({
      client: props.configuration.client,
      refreshToken: 0,
      content: null,
    }).type,
  ).toBe(PikdCdaProfile);
  expect(props.launch.configuration.campaign.title).toBe('Backend title');
  await act(async () => props.onClose());
  expect(button('demo-open-pikd').props.disabled).toBe(false);
  expect(
    renderer.root.findAllByType(PikdPreparedPartnerExperience),
  ).toHaveLength(0);
});
test('host color/font and email configuration reach CDA preflight without altering default demo branding', async () => {
  await mount({
    ...values,
    PIKD_EMAIL: 'host@example.com',
    PIKD_FONT_FAMILY: 'HostFont',
    PIKD_THEME: { colors: { primary: '#123456', surface: '#345678' } },
  });
  expect(button('demo-open-pikd').props.style.backgroundColor).toBe('#123456');
  expect(
    renderer.root
      .findAllByType(Text)
      .find(node => node.props.children === 'Partner club')!.props.style
      .fontFamily,
  ).toBe('HostFont');
  await open();
  expect(prepare.mock.calls[0][0].email).toBe('host@example.com');
  expect(prepare.mock.calls[0][0].theme.colors.surface).toBe('#345678');
  expect(prepare.mock.calls[0][0].theme.colors.primaryGradient).toEqual([
    '#123456',
    '#123456',
  ]);
  expect(prepare.mock.calls[0][0].theme.typography.caption.fontFamily).toBe(
    'HostFont',
  );
});
test('account replacement cancels pending CDA preflight and suppresses its late route', async () => {
  let resolve!: (
    value: Awaited<ReturnType<typeof prepareCdaExperience>>,
  ) => void;
  prepare.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  await mount();
  await open();
  const signal = prepare.mock.calls[0][1]!.signal!;
  await act(async () =>
    renderer.update(<App values={{ ...values, PIKD_USER: 'b' }} />),
  );
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ kind: 'outdated', presentation: {} }));
  expect(
    renderer.root.findAllByType(PikdPreparedPartnerExperience),
  ).toHaveLength(0);
  await open();
  expect(prepare.mock.calls.at(-1)![0].userRef).toBe('b');
});
test('double tap performs a single preflight and waits on host screen until response', async () => {
  let resolve!: (
    value: Awaited<ReturnType<typeof prepareCdaExperience>>,
  ) => void;
  prepare.mockImplementation(
    () =>
      new Promise(yes => {
        resolve = yes;
      }),
  );
  await mount();
  const press = button('demo-open-pikd').props.onPress;
  await act(async () => {
    press();
    press();
  });
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(
    renderer.root.findAllByType(PikdPreparedPartnerExperience),
  ).toHaveLength(0);
  await act(async () => resolve({ kind: 'outdated', presentation: {} }));
  expect(
    renderer.root.findByType(PikdPreparedPartnerExperience).props.launch.kind,
  ).toBe('outdated');
});
test('language selection launches the selected EN/RU/KK locale without rebuilding', async () => {
  await mount();
  for (const locale of ['en', 'ru', 'kk'] as const) {
    await act(async () =>
      renderer.root.findByType(LanguageSelector).props.onChange(locale),
    );
    await open();
    expect(prepare.mock.calls.at(-1)![0].locale).toBe(locale);
    const props = renderer.root.findByType(PikdPreparedPartnerExperience).props;
    await act(async () => props.onClose());
    expect(button('demo-open-pikd').props.disabled).toBe(false);
  }
});
test('all active-challenge errors use host campaign guidance; request errors use generic copy', async () => {
  for (const code of [
    'no-active-challenge',
    'multiple-active-challenges',
    'unnamed-active-challenge',
  ] as const) {
    prepare.mockRejectedValue(new PikdPartnerLaunchError(code, 'private'));
    await mount();
    await open();
    expect(texts()).toContain(
      'PIKD can open when this tenant has exactly one active challenge. Please contact PIKD.',
    );
    act(() => renderer.unmount());
  }
  prepare.mockRejectedValue(new Error('private'));
  await mount();
  await open();
  expect(texts()).toContain(
    'PIKD could not open right now. Please try again later.',
  );
});
test('unmount aborts preflight and late result never opens SDK; host Modal back forwards to SDK', async () => {
  let resolve!: (
    value: Awaited<ReturnType<typeof prepareCdaExperience>>,
  ) => void;
  prepare.mockImplementation(
    () =>
      new Promise(yes => {
        resolve = yes;
      }),
  );
  await mount();
  await open();
  const signal = prepare.mock.calls[0][1]!.signal!;
  act(() => renderer.unmount());
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ kind: 'outdated', presentation: {} }));
  prepare.mockImplementation(async configuration => ({
    kind: 'ready',
    configuration: { ...configuration, contentLanguageRef: 'ru' },
  }));
  await mount();
  await open();
  const modal = renderer.root
    .findAllByType(Modal)
    .find(node => node.props.presentationStyle === 'fullScreen')!;
  await act(async () => modal.props.onRequestClose());
  expect(mockBack).toHaveBeenCalledTimes(1);
});
test('RN defaults to English, honors supported locale overrides and retains radius parsing', () => {
  expect(initialLocale({ PIKD_UI_LOCALE: 'KK' })).toBe('kk');
  expect(initialLocale({ PIKD_LANGUAGE_REF: 'KZ' })).toBe('en');
  expect(initialLocale({ PIKD_UI_LOCALE: '', PIKD_LANGUAGE_REF: 'kk' })).toBe(
    'en',
  );
  expect(initialLocale({})).toBe('en');
  expect(initialLocale({ PIKD_LANGUAGE_REF: 'ru' })).toBe('en');
  expect(initialLocale({ PIKD_UI_LOCALE: 'RU' })).toBe('ru');
  expect(radiusMeters({})).toBe(5);
  expect(radiusMeters({ PIKD_DEMO_COLLECT_RADIUS_M: '6oops' })).toBe(5);
  expect(radiusMeters({ PIKD_DEMO_COLLECT_RADIUS_M: '2e1' })).toBe(20);
});

test('CDA entry branding defaults when omitted and configured host names remain supported', async () => {
  await mount({
    ...values,
    PIKD_PARTNER_LABEL: undefined,
    PIKD_PARTNER_ITEM_BRAND: undefined,
    PIKD_PARTNER_APP_NAME: undefined,
  });
  expect(texts()).toContain('CDA');
  expect(texts()).toContain("Welcome to CDA's Interactive Christmas Trail!");
  expect(texts()).toContain(
    'Explore the Christmas light displays and find all 14 artefacts to win a prize. The fastest to finish wins something extra special. One prize each, but run the trail as many times as you like.',
  );
  await open();
  expect(prepare.mock.calls[0][0].branding).toEqual({
    label: 'CDA',
    itemBrand: 'CDA',
    appName: 'CDA',
  });
});

test('CDA demo uses cyan tokens and derives its default gradient from a host primary override', async () => {
  await mount();
  expect(button('demo-open-pikd').props.style.backgroundColor).toBe('#029aa5');
  await open();
  const theme = prepare.mock.calls[0][0].theme;
  expect(theme.colors.primaryGradient).toEqual(['#029aa5', '#029aa5']);
  expect(theme.colors.activeAccent).toBe('#029aa5');
  expect(theme.colors.onPrimary).toBe(theme.colors.background);
  expect(theme.colors.onSurfaceBrand).toBe(theme.colors.background);
  expect(theme.colors.rank1).toBe('#029aa5');
});

test('welcome copy localizes and keeps configured partner names literal', () => {
  for (const locale of ['en', 'ru', 'kk'] as const) {
    const strings = demoStrings(locale, 'Partner $&');
    expect(strings.welcomeTitle).toContain('Partner $&');
    expect(strings.welcomeTitle).not.toContain('{{partner}}');
    expect(strings.experienceDescription).toContain('14');
  }
});

test('optional nickname is retained on return, editable for the next launch and scoped to the account', async () => {
  await mount();
  const input = () => renderer.root.findByType(TextInput);
  expect(input().props.value).toBe('');
  await act(async () => input().props.onChangeText('  Snow Fox  '));
  await open();
  expect(prepare.mock.calls[0][0].nickName).toBe('Snow Fox');
  expect(prepare.mock.calls[0][0].userRef).toBe(values.PIKD_USER);
  expect(input().props.editable).toBe(false);
  await act(async () =>
    renderer.root.findByType(PikdPreparedPartnerExperience).props.onClose(),
  );
  expect(input().props.value).toBe('  Snow Fox  ');
  expect(input().props.editable).toBe(true);
  await act(async () => input().props.onChangeText('Winter Bird'));
  await open();
  expect(prepare.mock.calls[1][0].nickName).toBe('Winter Bird');
  await act(async () =>
    renderer.root.findByType(PikdPreparedPartnerExperience).props.onClose(),
  );
  await act(async () =>
    renderer.update(
      <App values={{ ...values, PIKD_USER: 'another-account' }} />,
    ),
  );
  expect(input().props.value).toBe('');
  await open();
  expect(prepare.mock.calls[2][0].nickName).toBeUndefined();
});
