import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StepProgress } from '@/components/step-progress';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
  showBack?: boolean;
};

export function ScreenHeader({ title, subtitle, step, totalSteps = 4, showBack = false }: Props) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {showBack && (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.surfaceAlt },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
      )}

      {step !== undefined && (
        <View style={styles.stepRow}>
          <ThemedText themeColor="textMuted" type="small">
            Step {step} of {totalSteps}
          </ThemedText>
          <View style={styles.progressWrap}>
            <StepProgress step={step} total={totalSteps} />
          </View>
        </View>
      )}

      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle && (
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one, marginBottom: Spacing.three },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  pressed: { opacity: 0.6 },
  stepRow: { gap: Spacing.one, marginBottom: Spacing.one },
  progressWrap: { width: 96 },
  title: { marginTop: Spacing.one },
  subtitle: { marginTop: 2 },
});
