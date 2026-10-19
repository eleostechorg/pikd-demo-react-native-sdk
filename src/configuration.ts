import type {
  PikdLocale,
  PikdThemeOverrides,
} from '@eleostechorg/pikd-react-native-ui';
export interface DemoValues {
  PIKD_DIAGNOSTICS?: boolean;
  PIKD_BASE?: string;
  PIKD_SDK_KEY?: string;
  PIKD_USER?: string;
  PIKD_EMAIL?: string;
  PIKD_THEME?: PikdThemeOverrides;
  PIKD_FONT_FAMILY?: string;
  PIKD_UI_LOCALE?: string;
  PIKD_LANGUAGE_REF?: string;
  PIKD_DEMO_COLLECT_RADIUS_M?: number | string;
  PIKD_PARTNER_LABEL?: string;
  PIKD_PARTNER_ITEM_BRAND?: string;
  PIKD_PARTNER_APP_NAME?: string;
}
export function initialLocale(values: DemoValues): PikdLocale {
  const locale = (values.PIKD_UI_LOCALE ?? '').toLowerCase();
  return locale === 'ru' || locale === 'kk' ? locale : 'en';
}
export function missingConfiguration(values: DemoValues) {
  return (['PIKD_BASE', 'PIKD_SDK_KEY', 'PIKD_USER'] as const).filter(
    key => !values[key]?.trim(),
  );
}
export function radiusMeters(values: DemoValues) {
  const raw = String(values.PIKD_DEMO_COLLECT_RADIUS_M ?? '').trim();
  if (raw === 'NaN') return Number.NaN;
  return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) ||
    /^[+-]?Infinity$/.test(raw)
    ? Number(raw)
    : 5;
}
export function branding(values: DemoValues) {
  const label = values.PIKD_PARTNER_LABEL?.trim() || 'CDA';
  return {
    label,
    itemBrand: values.PIKD_PARTNER_ITEM_BRAND?.trim() || label,
    appName: values.PIKD_PARTNER_APP_NAME?.trim() || label,
  };
}
