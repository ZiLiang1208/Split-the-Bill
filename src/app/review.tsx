import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { money } from '@/components/split-breakdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ReceiptItem, useBill } from '@/lib/bill-context';
import { parseReceiptImage } from '@/lib/parse-receipt';
import { resolveDiscountAmount } from '@/lib/split';

export default function ReviewScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    imageUri,
    items,
    tax,
    tip,
    discount,
    discountMode,
    setParsedReceipt,
    setTax,
    setTip,
    setDiscount,
    setDiscountMode,
    addItem,
    updateItem,
    removeItem,
    splitItem,
  } = useBill();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const itemsSubtotal = items.reduce((sum, item) => sum + item.price, 0);
  const resolvedDiscount = resolveDiscountAmount(itemsSubtotal, discount, discountMode);

  const runParse = useCallback(async () => {
    if (!imageUri) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseReceiptImage(imageUri);
      setParsedReceipt(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong parsing the receipt.');
    } finally {
      setLoading(false);
      setAttempted(true);
    }
  }, [imageUri, setParsedReceipt]);

  useEffect(() => {
    if (!attempted && items.length === 0 && imageUri) {
      runParse();
    }
  }, [attempted, items.length, imageUri, runParse]);

  function renderItem({ item }: { item: ReceiptItem }) {
    return (
      <ThemedView style={[styles.itemCard, { borderColor: theme.border }, Shadow.sm]}>
        <View style={styles.itemRow}>
          <TextInput
            style={[styles.input, styles.nameInput, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
            value={item.name}
            onChangeText={(text) => updateItem(item.id, { name: text })}
            placeholder="Item name"
            placeholderTextColor={theme.textMuted}
          />
          <TextInput
            style={[styles.input, styles.qtyInput, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
            value={String(item.quantity)}
            onChangeText={(text) =>
              updateItem(item.id, { quantity: Number(text.replace(/[^0-9.]/g, '')) || 1 })
            }
            keyboardType="numeric"
            placeholder="Qty"
            placeholderTextColor={theme.textMuted}
          />
          <View style={styles.priceField}>
            <ThemedText themeColor="textMuted" type="small">
              $
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.priceInput,
                { backgroundColor: theme.surfaceAlt, color: theme.text },
              ]}
              value={String(item.price)}
              onChangeText={(text) => updateItem(item.id, { price: Number(text.replace(/[^0-9.]/g, '')) || 0 })}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <Pressable
            onPress={() => removeItem(item.id)}
            hitSlop={8}
            style={[styles.iconButton, { backgroundColor: theme.dangerMuted }]}
          >
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
          </Pressable>
        </View>
        {item.quantity > 1 && (
          <Pressable
            onPress={() => splitItem(item.id)}
            style={[styles.splitButton, { backgroundColor: theme.primaryMuted }]}
          >
            <Ionicons name="git-branch-outline" size={14} color={theme.primary} />
            <ThemedText type="linkPrimary">Split into {item.quantity} separate items</ThemedText>
          </Pressable>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {loading ? (
          <View style={styles.centered}>
            <ThemedView type="primaryMuted" style={styles.loadingIcon}>
              <ActivityIndicator size="large" color={theme.primary} />
            </ThemedView>
            <ThemedText type="smallBold" style={styles.loadingText}>
              Reading your receipt…
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small" style={styles.centeredText}>
              This usually takes a few seconds
            </ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <ThemedView type="dangerMuted" style={styles.loadingIcon}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.danger} />
            </ThemedView>
            <ThemedText type="subtitle" style={styles.centeredText}>
              Couldn&apos;t read the receipt
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small" style={styles.centeredText}>
              {error}
            </ThemedText>
            <PrimaryButton label="Try Again" icon="refresh" onPress={runParse} style={styles.retryButton} />
          </View>
        ) : (
          <>
            <ScreenHeader
              title="Review Items"
              subtitle="Fix anything we misread before splitting."
              step={2}
              showBack
            />
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListFooterComponent={
                <View>
                  <Pressable
                    onPress={addItem}
                    style={[styles.addItemButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  >
                    <Ionicons name="add" size={18} color={theme.text} />
                    <ThemedText type="smallBold">Add Item</ThemedText>
                  </Pressable>

                  <ThemedView style={[styles.totalsCard, { borderColor: theme.border }, Shadow.sm]}>
                    <View style={styles.totalField}>
                      <View style={styles.totalLabelRow}>
                        <Ionicons name="ribbon-outline" size={15} color={theme.success} />
                        <ThemedText themeColor="success" type="small">
                          Discount
                        </ThemedText>
                      </View>
                      <View style={styles.discountControls}>
                        <View style={[styles.miniSegmented, { backgroundColor: theme.surfaceAlt }]}>
                          <Pressable
                            onPress={() => setDiscountMode('amount')}
                            style={[
                              styles.miniSegment,
                              discountMode === 'amount' && { backgroundColor: theme.success },
                            ]}
                          >
                            <ThemedText
                              type="smallBold"
                              style={discountMode === 'amount' && { color: theme.onSuccess }}
                              themeColor={discountMode === 'amount' ? undefined : 'textMuted'}
                            >
                              $
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() => setDiscountMode('percent')}
                            style={[
                              styles.miniSegment,
                              discountMode === 'percent' && { backgroundColor: theme.success },
                            ]}
                          >
                            <ThemedText
                              type="smallBold"
                              style={discountMode === 'percent' && { color: theme.onSuccess }}
                              themeColor={discountMode === 'percent' ? undefined : 'textMuted'}
                            >
                              %
                            </ThemedText>
                          </Pressable>
                        </View>
                        <View style={styles.priceField}>
                          <ThemedText themeColor="success" type="small">
                            {discountMode === 'percent' ? '-' : '-$'}
                          </ThemedText>
                          <TextInput
                            style={[styles.input, styles.totalsInput, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
                            value={String(discount)}
                            onChangeText={(text) => {
                              // Typing a "%" (e.g. pasting "10%") flips the mode
                              // so the value lands where the user expects.
                              if (text.includes('%')) setDiscountMode('percent');
                              setDiscount(Number(text.replace(/[^0-9.]/g, '')) || 0);
                            }}
                            keyboardType="decimal-pad"
                            placeholderTextColor={theme.textMuted}
                          />
                          {discountMode === 'percent' && (
                            <ThemedText themeColor="success" type="small">
                              %
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    </View>
                    {discountMode === 'percent' && discount > 0 && (
                      <ThemedText themeColor="textMuted" type="small" style={styles.discountHint}>
                        {discount}% off {money(itemsSubtotal)} = -{money(resolvedDiscount)}
                      </ThemedText>
                    )}
                    <View style={styles.totalField}>
                      <View style={styles.totalLabelRow}>
                        <Ionicons name="pricetag-outline" size={15} color={theme.textSecondary} />
                        <ThemedText themeColor="textSecondary" type="small">
                          Tax
                        </ThemedText>
                      </View>
                      <View style={styles.priceField}>
                        <ThemedText themeColor="textMuted" type="small">
                          $
                        </ThemedText>
                        <TextInput
                          style={[styles.input, styles.totalsInput, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
                          value={String(tax)}
                          onChangeText={(text) => setTax(Number(text.replace(/[^0-9.]/g, '')) || 0)}
                          keyboardType="decimal-pad"
                          placeholderTextColor={theme.textMuted}
                        />
                      </View>
                    </View>
                    <View style={styles.totalField}>
                      <View style={styles.totalLabelRow}>
                        <Ionicons name="cash-outline" size={15} color={theme.textSecondary} />
                        <ThemedText themeColor="textSecondary" type="small">
                          Tip
                        </ThemedText>
                      </View>
                      <View style={styles.priceField}>
                        <ThemedText themeColor="textMuted" type="small">
                          $
                        </ThemedText>
                        <TextInput
                          style={[styles.input, styles.totalsInput, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
                          value={String(tip)}
                          onChangeText={(text) => setTip(Number(text.replace(/[^0-9.]/g, '')) || 0)}
                          keyboardType="decimal-pad"
                          placeholderTextColor={theme.textMuted}
                        />
                      </View>
                    </View>
                  </ThemedView>
                </View>
              }
            />

            <PrimaryButton
              label="Continue to Assign"
              icon="arrow-forward"
              disabled={items.length === 0}
              onPress={() => router.push('/assign')}
              style={styles.continueWrap}
            />
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  centeredText: { textAlign: 'center' },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  loadingText: { marginTop: Spacing.one },
  retryButton: { marginTop: Spacing.three, minWidth: 160 },
  list: { gap: Spacing.two, paddingBottom: Spacing.three },
  itemCard: {
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  splitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  input: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 15,
    minWidth: 44,
  },
  nameInput: { flex: 1 },
  qtyInput: { width: 40, textAlign: 'center' },
  priceField: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  priceInput: { width: 60, textAlign: 'right' },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.one,
  },
  totalsCard: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  totalField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalsInput: { width: 70, textAlign: 'right' },
  discountControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  miniSegmented: { flexDirection: 'row', borderRadius: Radius.pill, padding: 2 },
  miniSegment: {
    minWidth: 28,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountHint: { textAlign: 'right', marginTop: -Spacing.one },
  continueWrap: { marginTop: Spacing.two, marginBottom: Spacing.three },
});
