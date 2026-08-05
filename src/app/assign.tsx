import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemRow } from '@/components/item-row';
import { PersonAvatar } from '@/components/person-avatar';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, avatarColorFor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBill } from '@/lib/bill-context';

export default function AssignScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    items,
    people,
    assignments,
    addPerson,
    removePerson,
    toggleAssignment,
    taxTipSplitMode,
    setTaxTipSplitMode,
  } = useBill();
  const [nameInput, setNameInput] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  function handleAddPerson() {
    const name = nameInput.trim();
    if (!name) return;
    addPerson(name);
    setNameInput('');
  }

  function handlePersonPress(personId: string) {
    if (!selectedItemId) return;
    toggleAssignment(selectedItemId, personId);
  }

  const assignedCountFor = (personId: string) =>
    Object.values(assignments).filter((ids) => ids.includes(personId)).length;

  const unassignedCount = items.filter((item) => (assignments[item.id]?.length ?? 0) === 0).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScreenHeader
          title="Assign Items"
          subtitle={
            selectedItemId
              ? 'Tap a person to link the selected item.'
              : 'Tap an item, then tap a person to link them.'
          }
          step={3}
          showBack
        />

        {people.length > 0 && (
          <View style={styles.peopleWrap}>
            {people.map((person, index) => (
              <PersonAvatar
                key={person.id}
                person={person}
                color={avatarColorFor(index)}
                onPress={() => handlePersonPress(person.id)}
                onRemove={() => removePerson(person.id)}
                assignedCount={assignedCountFor(person.id)}
              />
            ))}
          </View>
        )}

        <View style={[styles.addPersonRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="person-add-outline" size={16} color={theme.textSecondary} />
          <TextInput
            style={[styles.nameInput, { color: theme.text }]}
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Add a person…"
            placeholderTextColor={theme.textMuted}
            onSubmitEditing={handleAddPerson}
            returnKeyType="done"
          />
          <Pressable onPress={handleAddPerson} style={[styles.addButton, { backgroundColor: theme.primary }]}>
            <Ionicons name="add" size={18} color={theme.onPrimary} />
          </Pressable>
        </View>

        <View style={styles.taxTipRow}>
          <ThemedText themeColor="textMuted" type="small">
            Tax &amp; tip
          </ThemedText>
          <View style={[styles.segmented, { backgroundColor: theme.surfaceAlt }]}>
            <Pressable
              onPress={() => setTaxTipSplitMode('even')}
              style={[styles.segment, taxTipSplitMode === 'even' && { backgroundColor: theme.primary }]}
            >
              <ThemedText
                type="small"
                style={taxTipSplitMode === 'even' && { color: theme.onPrimary }}
                themeColor={taxTipSplitMode === 'even' ? undefined : 'textSecondary'}
              >
                Evenly
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setTaxTipSplitMode('proportional')}
              style={[
                styles.segment,
                taxTipSplitMode === 'proportional' && { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText
                type="small"
                style={taxTipSplitMode === 'proportional' && { color: theme.onPrimary }}
                themeColor={taxTipSplitMode === 'proportional' ? undefined : 'textSecondary'}
              >
                By Order
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          style={styles.itemsList}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              people={people}
              assignedIds={assignments[item.id] ?? []}
              selected={selectedItemId === item.id}
              onPress={() => setSelectedItemId((current) => (current === item.id ? null : item.id))}
            />
          )}
        />

        {unassignedCount > 0 && (
          <View style={[styles.warningBanner, { backgroundColor: theme.warningMuted }]}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.warning} />
            <ThemedText themeColor="warning" type="small">
              Assign {unassignedCount} more item{unassignedCount === 1 ? '' : 's'} to continue
            </ThemedText>
          </View>
        )}

        <PrimaryButton
          label="See Split Summary"
          icon="arrow-forward"
          disabled={people.length === 0 || items.length === 0 || unassignedCount > 0}
          onPress={() => router.push('/summary')}
          style={styles.continueWrap}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  peopleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  addPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  nameInput: { flex: 1, fontSize: 14, paddingVertical: Spacing.one },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 3,
  },
  segment: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  itemsList: { flex: 1 },
  list: { gap: Spacing.two, paddingBottom: Spacing.two },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  continueWrap: { marginBottom: Spacing.three },
});
