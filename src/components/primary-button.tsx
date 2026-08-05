import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'success';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  iconPosition = 'right',
  variant = 'primary',
  style,
}: Props) {
  const theme = useTheme();
  const colors =
    variant === 'success' ? [theme.success, theme.success] : [theme.primary, theme.primaryPressed];
  const onColor = variant === 'success' ? theme.onSuccess : theme.onPrimary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, style, pressed && !disabled && styles.pressed]}
    >
      <LinearGradient
        colors={disabled ? [theme.border, theme.border] : (colors as [string, string])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        {icon && iconPosition === 'left' && (
          <Ionicons name={icon} size={18} color={disabled ? theme.textMuted : onColor} />
        )}
        <ThemedText
          themeColor={disabled ? 'textMuted' : undefined}
          style={[!disabled && { color: onColor }]}
          type="smallBold"
        >
          {label}
        </ThemedText>
        {icon && iconPosition === 'right' && (
          <Ionicons name={icon} size={18} color={disabled ? theme.textMuted : onColor} />
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.md },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  pressed: { opacity: 0.8 },
});
