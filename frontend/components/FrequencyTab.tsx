import { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { RadialRing } from './RadialRing';
import { DayList, DayLevel } from './DayList';
import { WeekHistoryStrip } from './WeekHistoryStrip';
import { WorkoutSession } from '@/lib/api';

type WeekStat = {
  isoWeek: string;
  startDate: string;
  endDate: string;
  days: [DayLevel, DayLevel, DayLevel, DayLevel, DayLevel, DayLevel, DayLevel];
  sessionNames: (string | null)[];
};

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildWeekStats(sessions: WorkoutSession[]): WeekStat[] {
  if (sessions.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonday = getMondayOf(today);

  const earliest = sessions.reduce((min, s) => {
    const d = new Date(s.date);
    return d < min ? d : min;
  }, new Date(sessions[0].date));
  const firstMonday = getMondayOf(earliest);

  const weekMap = new Map<string, { monday: Date; days: boolean[]; sessionNames: (string | null)[] }>();
  const cur = new Date(firstMonday);
  while (cur <= currentMonday) {
    weekMap.set(toKey(cur), { monday: new Date(cur), days: Array(7).fill(false), sessionNames: Array(7).fill(null) });
    cur.setDate(cur.getDate() + 7);
  }

  sessions.forEach((s) => {
    const d = new Date(s.date);
    const monday = getMondayOf(d);
    const week = weekMap.get(toKey(monday));
    if (!week) return;
    const dayIdx = (d.getDay() + 6) % 7;
    week.days[dayIdx] = true;
    if (!week.sessionNames[dayIdx]) {
      week.sessionNames[dayIdx] = s.workoutTemplate?.name ?? null;
    }
  });

  return [...weekMap.values()].map(({ monday, days, sessionNames }) => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      isoWeek: toKey(monday),
      startDate: toKey(monday),
      endDate: toKey(sunday),
      days: days.map((d) => (d ? 1 : 0)) as [DayLevel, DayLevel, DayLevel, DayLevel, DayLevel, DayLevel, DayLevel],
      sessionNames,
    };
  });
}

function calcStreak(weeks: WeekStat[], target: number): number {
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const done = weeks[i].days.filter((d) => d === 1).length;
    if (done >= target) streak++;
    else break;
  }
  return streak;
}

type Props = {
  sessions: WorkoutSession[];
  totalCompleted: number;
  weeklyTarget: number;
};

export function FrequencyTab({ sessions, totalCompleted, weeklyTarget }: Props) {
  const weeks = useMemo(() => buildWeekStats(sessions), [sessions]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && weeks.length > 0) {
      setSelectedIndex(weeks.length - 1);
      initialized.current = true;
    }
  }, [weeks.length]);

  const streak = useMemo(() => calcStreak(weeks, weeklyTarget), [weeks, weeklyTarget]);

  const selectedWeek = weeks[selectedIndex] ?? null;
  const isCurrentWeek = selectedIndex === weeks.length - 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIndex = isCurrentWeek ? (today.getDay() + 6) % 7 : null;

  const done = selectedWeek ? selectedWeek.days.filter((d) => d === 1).length : 0;
  const weekLabel = weeks.length === 0 ? 'CETTE SEM.'
    : selectedIndex === weeks.length - 1 ? 'CETTE SEM.'
    : `S-${weeks.length - 1 - selectedIndex}`;

  const stripWeeks = useMemo(() =>
    weeks.map((w, i) => ({
      isoWeek: w.isoWeek,
      done: w.days.filter((d) => d === 1).length,
      target: weeklyTarget,
      label: i === weeks.length - 1 ? 'Cette' : `S-${weeks.length - 1 - i}`,
    })),
    [weeks, weeklyTarget]
  );

  if (weeks.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>🏋️</Text>
        <Text style={s.emptyTitle}>Aucune séance</Text>
        <Text style={s.emptySub}>Termine ta première séance pour voir ta fréquence</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.kpiRow}>
        <View style={s.kpiCard}>
          <Text style={s.kpiVal}>{streak} 🔥</Text>
          <Text style={s.kpiLabel}>Streak</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiVal}>{totalCompleted}</Text>
          <Text style={s.kpiLabel}>Total séances</Text>
        </View>
      </View>

      <View style={s.weekCard}>
        <Text style={s.weekLabel}>{weekLabel}</Text>
        <View style={s.weekContent}>
          <RadialRing done={done} target={weeklyTarget} size={130} strokeWidth={12} />
          {selectedWeek && (
            <DayList
              days={selectedWeek.days}
              todayIndex={todayIndex}
              sessionNames={selectedWeek.sessionNames}
            />
          )}
        </View>
      </View>

      <Text style={s.sectionTitle}>HISTORIQUE</Text>
      <WeekHistoryStrip
        weeks={stripWeeks}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { paddingBottom: 40 },
  kpiRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16, marginTop: 8 },
  kpiCard: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, alignItems: 'center' },
  kpiVal: { color: '#f0f0f0', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  kpiLabel: { color: '#666', fontSize: 11, fontWeight: '600' },
  weekCard: { marginHorizontal: 16, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 24 },
  weekLabel: { color: '#00E87A', fontSize: 11, fontWeight: '700', marginBottom: 16 },
  weekContent: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  sectionTitle: { color: '#666', fontSize: 11, fontWeight: '700', paddingHorizontal: 16, marginBottom: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { color: '#f0f0f0', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center' },
});
