import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, WorkoutSession } from '@/lib/api';
import { colors, radius, spacing, programAccents } from '@/lib/theme';

// ── Formules ──────────────────────────────────────────────────────
function epley(w: number, r: number) {
  if (r <= 0 || w <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30));
}

function sessionVolume(s: WorkoutSession) {
  return s.loggedExercises.reduce(
    (t, ex) =>
      t +
      ex.sets.reduce(
        (sum, set) =>
          sum + (set.completed ? (set.actualWeight ?? 0) * (set.actualReps ?? 0) : 0),
        0
      ),
    0
  );
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

// ── Bar chart ─────────────────────────────────────────────────────
function BarChart({
  data,
  color,
  unit = '',
  height = 110,
}: {
  data: { label: string; value: number }[];
  color: string;
  unit?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 4 }}>
        {data.map((item, i) => {
          const h = Math.max((item.value / max) * (height - 22), item.value > 0 ? 4 : 0);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              {item.value > 0 && (
                <Text style={[bc.val, { color }]} numberOfLines={1}>
                  {item.value >= 1000
                    ? `${(item.value / 1000).toFixed(1)}t`
                    : `${item.value}${unit}`}
                </Text>
              )}
              <View style={{ width: '100%', height: h, backgroundColor: color, borderRadius: 4 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {data.map((item, i) => (
          <Text key={i} style={bc.label} numberOfLines={1}>{item.label}</Text>
        ))}
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  val: { fontSize: 9, fontWeight: '700', marginBottom: 2 },
  label: { flex: 1, color: colors.textMuted, fontSize: 8, textAlign: 'center' },
});

// ── Heatmap (5 semaines × 7 jours) ───────────────────────────────
function Heatmap({ sessionDates }: { sessionDates: Date[] }) {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  const LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const weeks: Date[][] = [];
  for (let i = 0; i < 5; i++) weeks.push(days.slice(i * 7, i * 7 + 7));

  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 4, gap: 4 }}>
        {LABELS.map((l, i) => (
          <Text key={i} style={hm.label}>{l}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
          {week.map((day, di) => {
            const has = sessionDates.some((d) => isSameDay(d, day));
            const isToday = isSameDay(day, new Date());
            return (
              <View
                key={di}
                style={[
                  hm.cell,
                  has && hm.cellActive,
                  isToday && hm.cellToday,
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const hm = StyleSheet.create({
  label: { flex: 1, color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 3,
    backgroundColor: colors.surface2,
  },
  cellActive: { backgroundColor: colors.accent + 'aa' },
  cellToday: { borderWidth: 1.5, borderColor: colors.accent },
});

// ── Écran principal ───────────────────────────────────────────────
type Tab = 'progression' | 'records' | 'frequence';

export default function StatsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('progression');

  // Progression tab
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // Records tab (1RM calculator)
  const [rmWeight, setRmWeight] = useState('');
  const [rmReps, setRmReps] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.sessions.history();
      setSessions(data);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completed = useMemo(() => sessions.filter((s) => s.status === 'completed'), [sessions]);

  const tonnageData = useMemo(
    () =>
      completed
        .slice(0, 10)
        .reverse()
        .map((s) => ({ label: shortDate(s.date), value: sessionVolume(s) })),
    [completed]
  );

  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    completed.forEach((s) => s.loggedExercises.forEach((e) => names.add(e.name)));
    return [...names].sort();
  }, [completed]);

  const progressionData = useMemo(() => {
    if (!selectedExercise) return [];
    return completed
      .filter((s) => s.loggedExercises.some((e) => e.name === selectedExercise))
      .slice(0, 10)
      .reverse()
      .map((s) => {
        const ex = s.loggedExercises.find((e) => e.name === selectedExercise)!;
        const best = ex.sets
          .filter((set) => set.completed && set.actualWeight != null)
          .reduce((max, set) => Math.max(max, set.actualWeight!), 0);
        return { label: shortDate(s.date), value: best };
      })
      .filter((d) => d.value > 0);
  }, [completed, selectedExercise]);

  // Per-exercise bests (for Records tab)
  const exerciseBests = useMemo(() => {
    const map = new Map<string, { weight: number; reps: number; date: string }>();
    completed.forEach((s) => {
      s.loggedExercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          if (!set.completed || set.actualWeight == null) return;
          const prev = map.get(ex.name);
          if (!prev || set.actualWeight > prev.weight) {
            map.set(ex.name, {
              weight: set.actualWeight,
              reps: set.actualReps ?? 0,
              date: s.date,
            });
          }
        });
      });
    });
    return [...map.entries()]
      .map(([name, best]) => ({ name, ...best, rm: epley(best.weight, best.reps) }))
      .sort((a, b) => b.rm - a.rm);
  }, [completed]);

  // Frequency stats
  const freqStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeek = completed.filter((s) => new Date(s.date) >= startOfWeek).length;

    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const sessionDates = completed.map((s) => new Date(s.date));
    for (let i = 0; i < 365; i++) {
      const has = sessionDates.some((d) => isSameDay(d, cursor));
      if (has) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (i === 0) {
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return { thisWeek, streak, sessionDates };
  }, [completed]);

  const w = parseFloat(rmWeight) || 0;
  const r = parseInt(rmReps) || 0;
  const rm = w > 0 && r > 0 && r <= 30 ? epley(w, r) : null;
  const rmPercentages = [100, 95, 90, 85, 80, 75, 70, 65, 60];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['progression', 'records', 'frequence'] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = {
            progression: 'Progression',
            records: 'Records',
            frequence: 'Fréquence',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.accent}
          />
        }
      >
        {/* ── PROGRESSION ── */}
        {activeTab === 'progression' && (
          <>
            {tonnageData.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TONNAGE PAR SÉANCE</Text>
                <Text style={styles.chartSub}>
                  Volume (poids × reps) des {tonnageData.length} dernières séances
                </Text>
                <BarChart data={tonnageData} color={colors.accent} />
              </View>
            )}

            {exerciseNames.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROGRESSION PAR EXERCICE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.sm }}>
                    {exerciseNames.map((name) => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.chip, selectedExercise === name && styles.chipActive]}
                        onPress={() => setSelectedExercise(selectedExercise === name ? null : name)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, selectedExercise === name && styles.chipTextActive]}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {selectedExercise && (
                  progressionData.length > 0 ? (
                    <View style={{ gap: spacing.xs }}>
                      <Text style={styles.chartSub}>Meilleur poids (kg) par séance</Text>
                      <BarChart data={progressionData} color={programAccents[1]} unit=" kg" />
                      {(() => {
                        const first = progressionData[0]?.value ?? 0;
                        const last = progressionData[progressionData.length - 1]?.value ?? 0;
                        const diff = last - first;
                        if (diff === 0) return null;
                        return (
                          <Text style={[styles.delta, { color: diff > 0 ? colors.accent : colors.danger }]}>
                            {diff > 0 ? '↑' : '↓'} {Math.abs(diff)} kg depuis le début
                          </Text>
                        );
                      })()}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>
                      Aucune donnée enregistrée pour cet exercice
                    </Text>
                  )
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>Aucune données</Text>
                <Text style={styles.emptySub}>
                  Termine des séances pour voir ta progression
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── RECORDS ── */}
        {activeTab === 'records' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CALCULATEUR 1RM</Text>
              <Text style={styles.chartSub}>Formule d'Epley — estimation de ta répétition max</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>POIDS (kg)</Text>
                  <TextInput
                    style={styles.rmInput}
                    keyboardType="decimal-pad"
                    placeholder="80"
                    placeholderTextColor={colors.textMuted}
                    value={rmWeight}
                    onChangeText={setRmWeight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>REPS</Text>
                  <TextInput
                    style={styles.rmInput}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.textMuted}
                    value={rmReps}
                    onChangeText={setRmReps}
                  />
                </View>
              </View>

              {rm ? (
                <>
                  <View style={styles.rmResult}>
                    <Text style={styles.rmValue}>{rm} kg</Text>
                    <Text style={styles.rmLabel}>1RM estimé</Text>
                  </View>
                  <View style={styles.percentTable}>
                    <View style={styles.percentTableHeader}>
                      <Text style={[styles.percentCell, { color: colors.textMuted }]}>%</Text>
                      <Text style={[styles.percentCell, { color: colors.textMuted }]}>Poids</Text>
                      <Text style={[styles.percentCell, { flex: 2, color: colors.textMuted }]}>Utilisation</Text>
                    </View>
                    {rmPercentages.map((pct) => {
                      const kg = Math.round(rm * pct / 100);
                      const uses: Record<number, string> = {
                        100: 'Force max', 95: '1–2 reps', 90: '3–4 reps',
                        85: 'Puissance 5r', 80: 'Hypertro 6–8r', 75: 'Hypertro 8–10r',
                        70: 'Endurance 12r', 65: 'Endurance 15r', 60: 'Récupération',
                      };
                      return (
                        <View key={pct} style={styles.percentRow}>
                          <Text style={styles.percentPct}>{pct}%</Text>
                          <Text style={styles.percentKg}>{kg} kg</Text>
                          <Text style={[styles.percentUse, { flex: 2 }]}>{uses[pct]}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text style={styles.rmHint}>
                  {r > 30
                    ? "La formule est fiable jusqu'à 30 reps max"
                    : 'Saisis un poids et un nombre de répétitions'}
                </Text>
              )}
            </View>

            {exerciseBests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MEILLEURS LIFTS</Text>
                {exerciseBests.map((item, idx) => (
                  <View key={item.name} style={styles.prRow}>
                    <Text style={styles.prMedal}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prName}>{item.name}</Text>
                      <Text style={styles.prDate}>
                        {new Date(item.date).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={styles.prBadge}>
                      <Text style={styles.prWeight}>{item.weight} kg</Text>
                      <Text style={styles.prRm}>~{item.rm} kg 1RM</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {exerciseBests.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>Aucun record</Text>
                <Text style={styles.emptySub}>Termine des séances pour voir tes records</Text>
              </View>
            )}
          </>
        )}

        {/* ── FRÉQUENCE ── */}
        {activeTab === 'frequence' && (
          <>
            <View style={styles.freqStats}>
              <View style={styles.freqStatBox}>
                <Text style={styles.freqStatValue}>{freqStats.streak}</Text>
                <Text style={styles.freqStatLabel}>Jours consécutifs 🔥</Text>
              </View>
              <View style={styles.freqStatBox}>
                <Text style={styles.freqStatValue}>{freqStats.thisWeek}</Text>
                <Text style={styles.freqStatLabel}>Séances cette semaine</Text>
              </View>
              <View style={styles.freqStatBox}>
                <Text style={styles.freqStatValue}>{completed.length}</Text>
                <Text style={styles.freqStatLabel}>Total séances</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ACTIVITÉ — 5 DERNIÈRES SEMAINES</Text>
              <View style={styles.heatmapCard}>
                <Heatmap sessionDates={freqStats.sessionDates} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HISTORIQUE</Text>
              {completed.length === 0 ? (
                <Text style={styles.emptyText}>Aucune séance terminée pour l'instant</Text>
              ) : (
                completed.map((session, idx) => {
                  const vol = sessionVolume(session);
                  const doneSets = session.loggedExercises.reduce(
                    (a, ex) => a + ex.sets.filter((s) => s.completed).length,
                    0
                  );
                  const totalSets = session.loggedExercises.reduce((a, ex) => a + ex.sets.length, 0);
                  const accentColor = programAccents[idx % programAccents.length];

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.historyCard}
                      onPress={() => router.push(`/history/${session.id}`)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.historyAccent, { backgroundColor: accentColor }]} />
                      <View style={styles.historyBody}>
                        <View style={styles.historyHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyName}>{session.workoutTemplate.name}</Text>
                            <Text style={styles.historyProg}>{session.workoutTemplate.program.name}</Text>
                          </View>
                          <Text style={styles.historyChevron}>›</Text>
                        </View>
                        <Text style={styles.historyDate}>
                          {new Date(session.date).toLocaleDateString('fr-FR', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })}
                        </Text>
                        <View style={styles.historyMeta}>
                          <Text style={styles.historyMetaText}>
                            {session.loggedExercises.length} exercices
                          </Text>
                          <Text style={styles.historyDot}>·</Text>
                          <Text style={styles.historyMetaText}>{doneSets}/{totalSets} séries</Text>
                          {vol > 0 && (
                            <>
                              <Text style={styles.historyDot}>·</Text>
                              <Text style={[styles.historyMetaText, { color: accentColor }]}>
                                {vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${vol} kg`}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.accent },
  tabBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabBtnTextActive: { color: colors.accent, fontWeight: '800' },

  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },

  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  chartSub: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },

  chip: {
    backgroundColor: colors.surface2,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipActive: { backgroundColor: '#0f2318', borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.accent },

  delta: { fontSize: 13, fontWeight: '700', marginTop: 4 },

  // 1RM calculator
  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  rmInput: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  rmResult: {
    backgroundColor: '#0f2318',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent + '60',
    marginTop: spacing.sm,
  },
  rmValue: { color: colors.accent, fontSize: 36, fontWeight: '900' },
  rmLabel: { color: colors.accent, fontSize: 13, opacity: 0.8, marginTop: 2 },
  rmHint: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: spacing.sm },

  percentTable: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  percentTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  percentCell: { flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  percentRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  percentPct: { flex: 1, color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  percentKg: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  percentUse: { color: colors.textMuted, fontSize: 12 },

  // PR rows
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  prMedal: { fontSize: 20, width: 28, textAlign: 'center' },
  prName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  prDate: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  prBadge: { alignItems: 'flex-end' },
  prWeight: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  prRm: { color: colors.textMuted, fontSize: 10, marginTop: 1 },

  // Frequency
  freqStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  freqStatBox: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  freqStatValue: { color: colors.accent, fontSize: 22, fontWeight: '900' },
  freqStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  heatmapCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },

  // History list
  historyCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  historyAccent: { width: 4 },
  historyBody: { flex: 1, padding: spacing.md, gap: 4 },
  historyHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  historyName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  historyProg: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  historyChevron: { color: colors.textMuted, fontSize: 22, fontWeight: '300', marginTop: -2 },
  historyDate: { color: colors.textMuted, fontSize: 12, textTransform: 'capitalize' },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  historyMetaText: { color: colors.textMuted, fontSize: 12 },
  historyDot: { color: colors.textMuted, fontSize: 12 },

  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic', paddingVertical: spacing.sm },
});
