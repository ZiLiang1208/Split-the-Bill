import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DraggableItemRow } from '@/components/draggable-item-row';
import { PersonAvatar } from '@/components/person-avatar';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, avatarColorFor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBill } from '@/lib/bill-context';
import type { PersonLayout } from '@/lib/geometry';

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
  const personRefs = useRef<Record<string, View | null>>({});
  const personLayouts = useSharedValue<Record<string, PersonLayout>>({});

  const remeasure = useCallback(() => {
    people.forEach((person) => {
      const node = personRefs.current[person.id];
      node?.measureInWindow((x, y, width, height) => {
        personLayouts.value = {
          ...personLayouts.value,
          [person.id]: { id: person.id, x, y, width, height },
        };
      });
    });
  }, [people, personLayouts]);

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
              : 'Tap an item then a person to link them — or press & hold to drag.'
          }
          step={3}
          showBack
        />

        <ThemedText themeColor="textSecondary" type="small" style={styles.sectionLabel}>
          WHO&apos;S SPLITTING
        </ThemedText>
        <View style={styles.peopleRow} onLayout={remeasure}>
          {people.map((person, index) => (
            <PersonAvatar
              key={person.id}
              ref={(node) => {
                personRefs.current[person.id] = node;
              }}
              person={person}
              color={avatarColorFor(index)}
              onLayout={remeasure}
              onPress={() => handlePersonPress(person.id)}
              onRemove={() => removePerson(person.id)}
              assignedCount={assignedCountFor(person.id)}
            />
          ))}
        </View>

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
          <Pressable
            onPress={handleAddPerson}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={18} color={theme.onPrimary} />
          </Pressable>
        </View>

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
              Split Evenly
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
        <ThemedText themeColor="textMuted" type="small" style={styles.segmentHint}>
          Tax &amp; tip {taxTipSplitMode === 'even' ? 'split equally across everyone' : "split by each person's order"}
        </ThemedText>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DraggableItemRow
              item={item}
              people={people}
              assignedIds={assignments[item.id] ?? []}
              personLayouts={personLayouts}
              onDropOnPerson={(personId) => toggleAssignment(item.id, personId)}
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
  sectionLabel: { letterSpacing: 0.6, marginBottom: Spacing.two },
  peopleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.three,
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
  nameInput: { flex: 1, fontSize: 15, paddingVertical: Spacing.one },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 3,
    alignSelf: 'flex-start',
  },
  segment: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  segmentHint: { marginTop: Spacing.one, marginBottom: Spacing.three },
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
