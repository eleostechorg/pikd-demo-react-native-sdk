import {
  createPikdTheme,
  pikdDefaultTheme,
  withFontFamily,
} from '@eleostechorg/pikd-react-native-ui';
import type { DemoValues } from './configuration';
export function demoTheme(brandName: string, values: DemoValues = {}) {
  const primary = values.PIKD_THEME?.colors?.primary ?? '#029aa5';
  const background = '#0F0F10';
  const base = createPikdTheme({
    brandName,
    typography: withFontFamily(pikdDefaultTheme.typography, 'Manrope'),
    colors: {
      primary,
      onPrimary: background,
      activeAccent: primary,
      primaryGradient: [primary, primary],
      surfaceBrand: primary,
      onSurfaceBrand: background,
      background,
      surface: '#1A1B1D',
      surfaceVariant: '#2D2F32',
      glass: '#2D2F3280',
      navAccent: '#2D2F32',
      mapSurface: '#FFFFFFCC',
      onMapSurface: '#2D2F32',
      textSecondary: '#999999',
      textMuted: '#6E6E6E',
      onSurfaceInverse: '#2D2F32',
      border: '#2D2F32',
      success: '#00C387',
      warning: '#FF8200',
      error: '#F9423A',
      info: '#59CBE8',
      rank1: primary,
      rank2: primary,
      rank3: '#ECECEC',
    },
  });
  const theme = createPikdTheme(values.PIKD_THEME ?? {}, base);
  return createPikdTheme(
    {
      typography: withFontFamily(
        theme.typography,
        values.PIKD_FONT_FAMILY?.trim() ||
          theme.typography.fontFamily ||
          'Manrope',
      ),
    },
    theme,
  );
}
