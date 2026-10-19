import { usePikdTheme } from '@eleostechorg/pikd-react-native-ui';
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { PikdLocale } from '@eleostechorg/pikd-react-native-ui';
import { DemoIcon } from './icons';
const options = [
  { locale: 'ru', label: 'Русский' },
  { locale: 'kk', label: 'Қазақша' },
  { locale: 'en', label: 'English' },
] as const;
export function LanguageSelector({
  locale,
  label,
  onChange,
}: {
  locale: PikdLocale;
  label: string;
  onChange: (locale: PikdLocale) => void;
}) {
  const theme = usePikdTheme();
  const anchor = useRef<View>(null),
    { height } = useWindowDimensions();
  const [position, setPosition] = useState<{
    x: number;
    y: number;
    width: number;
  } | null>(null);
  const selected = options.findIndex(option => option.locale === locale);
  return (
    <>
      <View
        ref={anchor}
        collapsable={false}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <Pressable
          testID="demo-language-selector"
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${options[selected].label}`}
          accessibilityState={{ expanded: !!position }}
          onPress={() =>
            anchor.current?.measureInWindow((x, y, width) =>
              setPosition({
                x,
                y: Math.min(Math.max(8, y - selected * 48), height - 160),
                width,
              }),
            )
          }
          style={{ minHeight: 56, justifyContent: 'center' }}
        >
          <Text
            style={{
              fontFamily: theme.typography.fontFamily,
              fontSize: 12,
              lineHeight: 16,
              color: theme.colors.textSecondary,
            }}
          >
            {label}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontFamily: theme.typography.fontFamily,
                fontSize: 16,
                lineHeight: 24,
                color: theme.colors.textPrimary,
              }}
            >
              {options[selected].label}
            </Text>
            <DemoIcon name="dropdown" color={theme.colors.textSecondary} />
          </View>
        </Pressable>
      </View>
      <Modal
        visible={!!position}
        transparent
        onRequestClose={() => setPosition(null)}
        animationType="none"
      >
        <Pressable
          testID="demo-language-backdrop"
          onPress={() => setPosition(null)}
          style={{ flex: 1 }}
        >
          {position && (
            <View
              accessibilityViewIsModal
              style={{
                position: 'absolute',
                top: position.y,
                left: position.x + 16,
                width: position.width - 32,
                paddingVertical: 8,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: 4,
                elevation: 8,
                shadowColor: theme.colors.overlay,
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              {options.map(option => (
                <Pressable
                  key={option.locale}
                  testID={`demo-language-${option.locale}`}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: locale === option.locale }}
                  onPress={event => {
                    event.stopPropagation();
                    setPosition(null);
                    onChange(option.locale);
                  }}
                  style={{
                    height: 48,
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: theme.typography.fontFamily,
                      fontSize: 16,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}
