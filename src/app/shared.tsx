import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { SplitBreakdown } from '@/components/split-breakdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decodeShare } from '@/lib/share';
import { computeSplit } from '@/lib/split';

export default function SharedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { d } = useLocalSearchParams<{ d?: string }>();

  const snapshot = useMemo(() => (typeof d === 'string' ? decodeShare(d) : null), [d]);

  const result = useMemo(() => {
    if (!snapshot) return null;
    return computeSplit(
      snapshot.people,
      snapshot.items,
      snapshot.assignments,
      snapshot.tax,
      snapshot.tip,
      snapshot.taxTipSplitMode,
      snapshot.discount,
      snapshot.discountMode
    );
  }, [snapshot]);

  if (!snapshot || !result) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ThemedView type="dangerMuted" style={styles.icon}>
              <Ionicons name="link-outline" size={28} color={theme.danger} />
            </ThemedView>
            <ThemedText type="subtitle" style={styles.centeredText}>
              This link looks broken
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small" style={styles.centeredText}>
              Ask whoever sent it to re-share, or start your own split.
            </ThemedText>
            <PrimaryButton
              label="Split a Bill"
              icon="receipt-outline"
              onPress={() => router.replace('/')}
              style={styles.ctaButton}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <SplitBreakdown
          result={result}
          taxTipSplitMode={snapshot.taxTipSplitMode}
          peopleCount={snapshot.people.length}
          header={
            <View style={styles.header}>
              <ThemedText themeColor="textSecondary" type="small">
                Someone shared a bill split with you
              </ThemedText>
              <ThemedText type="title" style={styles.title}>
                Split Summary
              </ThemedText>
            </View>
          }
        />

        <PrimaryButton
          label="Split Your Own Bill"
          icon="receipt-outline"
          onPress={() => router.push('/')}
          style={styles.ctaButton}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  centeredText: { textAlign: 'center' },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  header: { marginBottom: Spacing.one },
  title: { marginTop: Spacing.one },
  ctaButton: { marginTop: Spacing.two, marginBottom: Spacing.three },
});
