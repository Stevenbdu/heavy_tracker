import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function Heatmap({ sessionDates }: { sessionDates: Date[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Date[] = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 34 + i);
    return d;
  });
  const weeks: Date[][] = Array.from({ length: 5 }, (_, i) => days.slice(i * 7, i * 7 + 7));

  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 4, gap: 4 }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
          <Text key={i} style={s.label}>{l}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
          {week.map((day, di) => {
            const has = sessionDates.some((d) => isSameDay(d, day));
            const isToday = isSameDay(day, new Date());
            return <View key={di} style={[s.cell, has && s.cellActive, isToday && s.cellToday]} />;
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  label: { flex: 1, color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 3, backgroundColor: colors.surface2 },
  cellActive: { backgroundColor: colors.accent + 'aa' },
  cellToday: { borderWidth: 1.5, borderColor: colors.accent },
});
