import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing, avatarColorFor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TaxTipSplitMode } from '@/lib/bill-context';
import type { PersonTotal, SplitResult } from '@/lib/split';

export function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

type Props = {
  result: SplitResult;
  taxTipSplitMode: TaxTipSplitMode;
  peopleCount: number;
  header: ReactNode;
  emptyMessage?: string;
};

export function SplitBreakdown({ result, taxTipSplitMode, peopleCount, header, emptyMessage }: Props) {
  const theme = useTheme();

  function renderPerson({ item: personTotal, index }: { item: PersonTotal; index: number }) {
    return (
      <ThemedView style={[styles.card, { borderColor: theme.border }, Shadow.sm]}>
        <View style={styles.cardHeader}>
          <View style={styles.personLabel}>
            <View style={[styles.avatar, { backgroundColor: avatarColorFor(index) }]}>
              <ThemedText type="small" style={styles.avatarText}>
                {initials(personTotal.person.name)}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{personTotal.person.name}</ThemedText>
          </View>
          <ThemedText type="subtitle">{money(personTotal.total)}</ThemedText>
        </View>

        {personTotal.items.map(({ item, shareOfPrice, splitBetween }) => (
          <View key={item.id} style={styles.lineRow}>
            <ThemedText themeColor="textSecondary" type="small" style={styles.lineName}>
              {item.name}
              {splitBetween > 1 ? ` (split ${splitBetween} ways)` : ''}
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {money(shareOfPrice)}
            </ThemedText>
          </View>
        ))}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.lineRow}>
          <ThemedText themeColor="textSecondary" type="small">
            Subtotal
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {money(personTotal.subtotal)}
          </ThemedText>
        </View>
        {personTotal.discountShare > 0 && (
          <View style={styles.lineRow}>
            <ThemedText themeColor="success" type="small">
              Discount share
            </ThemedText>
            <ThemedText themeColor="success" type="small">
              -{money(personTotal.discountShare)}
            </ThemedText>
          </View>
        )}
        <View style={styles.lineRow}>
          <ThemedText themeColor="textSecondary" type="small">
            Tax share
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {money(personTotal.taxShare)}
          </ThemedText>
        </View>
        <View style={styles.lineRow}>
          <ThemedText themeColor="textSecondary" type="small">
            Tip share
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {money(personTotal.tipShare)}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <FlatList
      data={result.perPerson}
      keyExtractor={(p) => p.person.id}
      renderItem={renderPerson}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <>
          {header}

          <ThemedView style={[styles.heroCard, Shadow.md]}>
            <ThemedText style={styles.heroLabel}>Receipt Total</ThemedText>
            <ThemedText style={styles.heroTotal}>{money(result.total)}</ThemedText>
            <View style={styles.heroRow}>
              <ThemedText style={styles.heroSubLabel} type="small">
                {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
              </ThemedText>
              <View style={styles.heroDot} />
              <ThemedText style={styles.heroSubLabel} type="small">
                Tax &amp; tip {taxTipSplitMode === 'even' ? 'split evenly' : 'split by order'}
              </ThemedText>
            </View>
          </ThemedView>

          {result.unassignedItems.length > 0 && (
            <View style={[styles.warningBanner, { backgroundColor: theme.warningMuted }]}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.warning} />
              <ThemedText themeColor="warning" type="small" style={styles.warningText}>
                {result.unassignedItems.length} item
                {result.unassignedItems.length === 1 ? ' is' : 's are'} unassigned and not included:{' '}
                {result.unassignedItems.map((i) => i.name).join(', ')}
              </ThemedText>
            </View>
          )}
          {peopleCount === 0 && emptyMessage && (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {emptyMessage}
            </ThemedText>
          )}
        </>
      }
      ListFooterComponent={
        <ThemedView style={[styles.card, styles.footerCard, { borderColor: theme.border }, Shadow.sm]}>
          <ThemedText type="smallBold" style={styles.footerTitle}>
            Receipt Breakdown
          </ThemedText>
          <View style={styles.lineRow}>
            <ThemedText themeColor="textSecondary" type="small">
              Subtotal
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {money(result.subtotal)}
            </ThemedText>
          </View>
          {result.discount > 0 && (
            <View style={styles.lineRow}>
              <ThemedText themeColor="success" type="small">
                Discount{result.discountPercent !== null ? ` (${result.discountPercent}%)` : ''}
              </ThemedText>
              <ThemedText themeColor="success" type="small">
                -{money(result.discount)}
              </ThemedText>
            </View>
          )}
          <View style={styles.lineRow}>
            <ThemedText themeColor="textSecondary" type="small">
              Tax
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {money(result.tax)}
            </ThemedText>
          </View>
          <View style={styles.lineRow}>
            <ThemedText themeColor="textSecondary" type="small">
              Tip
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {money(result.tip)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.lineRow}>
            <ThemedText type="smallBold">Total</ThemedText>
            <ThemedText type="smallBold">{money(result.total)}</ThemedText>
          </View>
        </ThemedView>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two, paddingBottom: Spacing.two },
  heroCard: {
    backgroundColor: '#6154E8',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: 4,
  },
  heroLabel: { color: '#E4E1FF', fontSize: 13, fontWeight: '600' },
  heroTotal: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: -0.6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroSubLabel: { color: '#E4E1FF' },
  heroDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#E4E1FF' },
  warningBanner: {
    flexDirection: 'row',
    gap: 8,
    padding: Spacing.two,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  warningText: { flex: 1 },
  emptyText: { textAlign: 'center', marginTop: Spacing.four },
  card: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, gap: 4 },
  footerCard: { marginTop: Spacing.one },
  footerTitle: { marginBottom: Spacing.one },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  personLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lineName: { flex: 1, marginRight: Spacing.two },
  divider: { height: 1, marginVertical: Spacing.one },
});
