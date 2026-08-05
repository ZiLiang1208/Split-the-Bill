import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { SplitBreakdown } from '@/components/split-breakdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBill } from '@/lib/bill-context';
import { buildShareUrl, encodeShare } from '@/lib/share';
import { shareLink } from '@/lib/share-link';
import { computeSplit } from '@/lib/split';

export default function SummaryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { items, people, assignments, tax, tip, taxTipSplitMode, reset } = useBill();
  const [sharing, setSharing] = useState(false);

  const result = useMemo(
    () => computeSplit(people, items, assignments, tax, tip, taxTipSplitMode),
    [people, items, assignments, tax, tip, taxTipSplitMode]
  );

  async function handleShare() {
    setSharing(true);
    try {
      const encoded = encodeShare({ people, items, assignments, tax, tip, taxTipSplitMode });
      const url = buildShareUrl(encoded);
      if (!url) {
        Alert.alert(
          'No web link yet',
          'Deploy the web build first, then this button will share a real link.'
        );
        return;
      }
      const outcome = await shareLink(url, `Here's how the bill splits up (total ${money(result.total)})`);
      if (outcome === 'copied') {
        Alert.alert('Link copied', 'Paste it to your friend — the summary is baked into the link.');
      } else if (outcome === 'unsupported') {
        Alert.alert('Copy this link', url);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <SplitBreakdown
          result={result}
          taxTipSplitMode={taxTipSplitMode}
          peopleCount={people.length}
          emptyMessage="Go back and add people to see a split."
          header={<ScreenHeader title="Split Summary" step={4} showBack />}
        />

        <PrimaryButton
          label={sharing ? 'Preparing link…' : 'Share Summary'}
          icon="share-outline"
          disabled={sharing || people.length === 0}
          onPress={handleShare}
          style={styles.shareWrap}
        />

        <Pressable
          onPress={() => {
            reset();
            router.replace('/');
          }}
          style={({ pressed }) => [
            styles.startOverButton,
            { borderColor: theme.border, backgroundColor: theme.surface },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.text} />
          <ThemedText type="smallBold">Start a New Bill</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  shareWrap: { marginTop: Spacing.one },
  startOverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  pressed: { opacity: 0.7 },
});
