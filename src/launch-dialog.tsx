import { usePikdTheme } from '@eleostechorg/pikd-react-native-ui';
import { Modal, Pressable, Text } from 'react-native';
export function LaunchDialog({
  title,
  message,
  close,
  onClose,
}: {
  title: string;
  message: string;
  close: string;
  onClose: () => void;
}) {
  const theme = usePikdTheme();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          paddingHorizontal: 40,
          justifyContent: 'center',
          backgroundColor: theme.colors.overlay,
        }}
      >
        <Pressable
          testID="demo-launch-error"
          accessibilityViewIsModal
          onPress={event => event.stopPropagation()}
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 28,
            padding: 24,
          }}
        >
          <Text
            style={{
              fontFamily: theme.typography.fontFamily,
              fontSize: 24,
              lineHeight: 32,
              color: theme.colors.textPrimary,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontFamily: theme.typography.fontFamily,
              fontSize: 14,
              lineHeight: 20,
              color: theme.colors.textSecondary,
              marginTop: 16,
            }}
          >
            {message}
          </Text>
          <Pressable
            testID="demo-launch-error-close"
            accessibilityRole="button"
            onPress={onClose}
            style={{
              alignSelf: 'flex-end',
              minHeight: 48,
              paddingHorizontal: 12,
              justifyContent: 'center',
              marginTop: 24,
            }}
          >
            <Text
              style={{
                fontFamily: theme.typography.fontFamily,
                fontSize: 14,
                fontWeight: '500',
                color: theme.colors.primary,
              }}
            >
              {close}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
