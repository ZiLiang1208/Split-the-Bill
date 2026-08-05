import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  step: number;
  total: number;
};

export function StepProgress({ step, total }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i < step ? theme.primary : theme.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
});
