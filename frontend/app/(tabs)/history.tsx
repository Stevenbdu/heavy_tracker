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
  LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, WorkoutSession } from '@/lib/api';
import { colors, radius, spacing, programAccents } from '@/lib/theme';
import { EXERCISES, MUSCLE_GROUPS } from '@/lib/exercises';

// ── Formules ──────────────────────────────────────────────────────
function epley(w: number, r: number) {
  if (r <= 0 || w <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30));
}

function formatVol(vol: number) {
  return vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)} kg`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

// ── LineChart ─────────────────────────────────────────────────────
type ChartPoint = { label: string; value: number };

function LineChart({
  data,
  color,
  unit = '',
  height = 130,
  gradientId,
}: {
  data: ChartPoint[];
  color: string;
  unit?: string;
  height?: number;
  gradientId: string;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (data.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }} onLayout={onLayout}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {data.length === 1 ? 'Besoin d\'au moins 2 séances' : 'Aucune donnée'}
        </Text>
      </View>
    );
  }

  const PAD = { top: 22, bottom: 20, left: 6, right: 6 };
  const cW = w - PAD.left - PAD.right;
  const cH = height - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xStep = cW / (data.length - 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + cH - ((v - min) / range) * cH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value), v: d.value, label: d.label }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;
  const recordIdx = values.indexOf(max);
  const lastIdx = data.length - 1;

  return (
    <View onLayout={onLayout}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <SvgGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.28" />
              <Stop offset="1" stopColor={color} stopOpacity="0.01" />
            </SvgGradient>
          </Defs>

          {/* Fill */}
          <Path d={fillPath} fill={`url(#${gradientId})`} />

          {/* Line */}
          <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots + value labels */}
          {pts.map((p, i) => {
            const isLast = i === lastIdx;
            const isRecord = i === recordIdx && recordIdx !== lastIdx;
            const showLabel = isLast || isRecord || i === 0;
            const dotR = isLast ? 5 : isRecord ? 4 : 2.5;
            const fill = isLast || isRecord ? color : colors.surface1;
            return (
              <G key={i}>
                <Circle cx={p.x} cy={p.y} r={dotR} fill={fill} stroke={color} strokeWidth={isLast || isRecord ? 0 : 1.5} />
                {showLabel && (
                  <SvgText
                    x={Math.min(Math.max(p.x, 20), w - 20)}
                    y={p.y - 8}
                    textAnchor="middle"
                    fill={isRecord ? '#f59e0b' : color}
                    fontSize={9}
                    fontWeight="700"
                  >
                    {p.v}{unit}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      )}

      {/* X labels */}
      {w > 0 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: PAD.left, marginTop: -6 }}>
          {pts.map((p, i) => (
            <Text
              key={i}
              style={{
                position: 'absolute',
                left: p.x - 16,
                width: 32,
                textAlign: 'center',
                color: colors.textMuted,
                fontSize: 8,
                fontWeight: '600',
              }}
            >
              {p.label}
            </Text>
          ))}
        </View>
      )}
      <View style={{ height: 14 }} />
    </View>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────
function Heatmap({ sessionDates }: { sessionDates: Date[] }) {
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
          <Text key={i} style={hm.label}>{l}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
          {week.map((day, di) => {
            const has = sessionDates.some((d) => isSameDay(d, day));
            const isToday = isSameDay(day, new Date());
            return <View key={di} style={[hm.cell, has && hm.cellActive, isToday && hm.cellToday]} />;
          })}
        </View>
      ))}
    </View>
  );
}
const hm = StyleSheet.create({
  label: { flex: 1, color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 3, backgroundColor: colors.surface2 },
  cellActive: { backgroundColor: colors.accent + 'aa' },
  cellToday: { borderWidth: 1.5, borderColor: colors.accent },
});

// ── Main screen ───────────────────────────────────────────────────
type Tab = 'progression' | 'records' | 'historique';

export default function StatsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('progression');

  // Progression tab state
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'30d' | '3m' | '6m' | 'all'>('all');

  // Records tab
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

  const sessionStats = useMemo(() => {
    const map = new Map<number, { volume: number; doneSets: number; totalSets: number }>();
    completed.forEach((s) => {
      let volume = 0, doneSets = 0, totalSets = 0;
      s.loggedExercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          totalSets++;
          if (set.completed) {
            doneSets++;
            volume += (set.actualWeight ?? 0) * (set.actualReps ?? 0);
          }
        });
      });
      map.set(s.id, { volume, doneSets, totalSets });
    });
    return map;
  }, [completed]);

  // ── Progression tab data ───────────────────────────────────────

  // All unique templates (for the type selector)
  const templates = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    completed.forEach((s) => {
      if (!map.has(s.workoutTemplate.id)) {
        map.set(s.workoutTemplate.id, { id: s.workoutTemplate.id, name: s.workoutTemplate.name });
      }
    });
    return [...map.values()];
  }, [completed]);

  // Sessions filtered by template + time window
  const filteredSessions = useMemo(() => {
    const cutoff = (() => {
      const now = new Date();
      if (timeFilter === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
      if (timeFilter === '3m')  { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
      if (timeFilter === '6m')  { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
      return null;
    })();
    return completed.filter((s) => {
      if (selectedTemplateId != null && s.workoutTemplate.id !== selectedTemplateId) return false;
      if (cutoff && new Date(s.date) < cutoff) return false;
      return true;
    });
  }, [completed, selectedTemplateId, timeFilter]);

  // Exercise names within filtered sessions
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    filteredSessions.forEach((s) => s.loggedExercises.forEach((e) => names.add(e.name)));
    return [...names].sort();
  }, [filteredSessions]);

  // Reset exercise selection when template changes
  const handleSelectTemplate = (id: number | null) => {
    setSelectedTemplateId(id);
    setSelectedExercise(null);
  };

  // Progression curve for selected exercise
  const progressionData = useMemo((): ChartPoint[] => {
    if (!selectedExercise) return [];
    return filteredSessions
      .filter((s) => s.loggedExercises.some((e) => e.name === selectedExercise))
      .slice(0, 12)
      .reverse()
      .map((s) => {
        const ex = s.loggedExercises.find((e) => e.name === selectedExercise)!;
        const best = ex.sets
          .filter((set) => set.completed && set.actualWeight != null)
          .reduce((max, set) => Math.max(max, set.actualWeight!), 0);
        return { label: shortDate(s.date), value: best };
      })
      .filter((d) => d.value > 0);
  }, [filteredSessions, selectedExercise]);

  // Tonnage curve for selected template
  const tonnageData = useMemo((): ChartPoint[] => {
    return filteredSessions
      .slice(0, 12)
      .reverse()
      .map((s) => ({ label: shortDate(s.date), value: sessionStats.get(s.id)?.volume ?? 0 }))
      .filter((d) => d.value > 0);
  }, [filteredSessions, sessionStats]);

  // ── Records tab data ───────────────────────────────────────────

  const exerciseBests = useMemo(() => {
    const map = new Map<string, { weight: number; reps: number; date: string }>();
    completed.forEach((s) => {
      s.loggedExercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          if (!set.completed || set.actualWeight == null) return;
          const prev = map.get(ex.name);
          if (!prev || set.actualWeight > prev.weight) {
            map.set(ex.name, { weight: set.actualWeight, reps: set.actualReps ?? 0, date: s.date });
          }
        });
      });
    });
    return [...map.entries()]
      .map(([name, best]) => ({ name, ...best, rm: epley(best.weight, best.reps) }))
      .sort((a, b) => b.rm - a.rm);
  }, [completed]);

  const w = parseFloat(rmWeight) || 0;
  const r = parseInt(rmReps) || 0;
  const rm = w > 0 && r > 0 && r <= 30 ? epley(w, r) : null;
  const rmPercentages = [100, 95, 90, 85, 80, 75, 70, 65, 60];

  // ── Historique tab data ────────────────────────────────────────

  const sessionsByTemplate = useMemo(() => {
    const map = new Map<number, { id: number; name: string; sessions: WorkoutSession[] }>();
    completed.forEach((s) => {
      const tid = s.workoutTemplate.id;
      if (!map.has(tid)) {
        map.set(tid, { id: tid, name: s.workoutTemplate.name, sessions: [] });
      }
      map.get(tid)!.sessions.push(s);
    });
    map.forEach((g) =>
      g.sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    return [...map.values()].sort(
      (a, b) => new Date(b.sessions[0].date).getTime() - new Date(a.sessions[0].date).getTime()
    );
  }, [completed]);

  // const muscleGroupWeeklyTonnage = useMemo(() => {
  //   const exGroup = new Map<string, string>(EXERCISES.map((e) => [e.name, e.muscleGroup]));

  //   const weekStart = (d: Date) => {
  //     const r = new Date(d);
  //     r.setHours(0, 0, 0, 0);
  //     r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  //     return r;
  //   };

  //   const today = new Date();
  //   const weeks: Date[] = Array.from({ length: 6 }, (_, i) => {
  //     const w = weekStart(today);
  //     w.setDate(w.getDate() - (5 - i) * 7);
  //     return w;
  //   });

  //   const weekMap = new Map<number, Map<string, number>>(
  //     weeks.map((w) => [w.getTime(), new Map()])
  //   );

  //   completed.forEach((s) => {
  //     const sw = weekStart(new Date(s.date));
  //     const entry = weekMap.get(sw.getTime());
  //     if (!entry) return;
  //     s.loggedExercises.forEach((ex) => {
  //       const group = exGroup.get(ex.name);
  //       if (!group) return;
  //       ex.sets.forEach((set) => {
  //         if (set.completed && set.actualWeight != null && set.actualReps != null) {
  //           entry.set(group, (entry.get(group) ?? 0) + set.actualWeight * set.actualReps);
  //         }
  //       });
  //     });
  //   });

  //   return weeks.map((w) => {
  //     const entry = weekMap.get(w.getTime())!;
  //     const groups = MUSCLE_GROUPS
  //       .map((g) => ({ ...g, volume: entry.get(g.id) ?? 0 }))
  //       .filter((g) => g.volume > 0);
  //     const total = groups.reduce((s, g) => s + g.volume, 0);
  //     return { label: `${w.getDate()}/${w.getMonth() + 1}`, groups, total };
  //   });
  // }, [completed]);

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
      if (has) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else if (i === 0) { cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    return { thisWeek, streak, sessionDates };
  }, [completed]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const selectedTemplateName = templates.find((t) => t.id === selectedTemplateId)?.name ?? 'Tout';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['progression', 'records', 'historique'] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = { progression: 'Progression', records: 'Records', historique: 'Historique' };
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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
        }
      >

        {/* ── PROGRESSION ── */}
        {activeTab === 'progression' && (
          <>
            {completed.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>Aucune donnée</Text>
                <Text style={styles.emptySub}>Termine des séances pour voir ta progression</Text>
              </View>
            ) : (
              <>
                {/* Session type selector */}
                {templates.length > 1 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>TYPE DE SÉANCE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.xs }}>
                        <TouchableOpacity
                          style={[styles.chip, selectedTemplateId == null && styles.chipActive]}
                          onPress={() => handleSelectTemplate(null)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.chipText, selectedTemplateId == null && styles.chipTextActive]}>
                            Tout
                          </Text>
                        </TouchableOpacity>
                        {templates.map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.chip, selectedTemplateId === t.id && styles.chipActive]}
                            onPress={() => handleSelectTemplate(t.id)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.chipText, selectedTemplateId === t.id && styles.chipTextActive]}>
                              {t.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Time filter */}
                <View style={styles.timeFilterRow}>
                  {(['30d', '3m', '6m', 'all'] as const).map((f) => {
                    const labels = { '30d': '30J', '3m': '3M', '6m': '6M', all: 'Tout' };
                    return (
                      <TouchableOpacity
                        key={f}
                        style={[styles.timeFilterBtn, timeFilter === f && styles.timeFilterBtnActive]}
                        onPress={() => setTimeFilter(f)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.timeFilterText, timeFilter === f && styles.timeFilterTextActive]}>
                          {labels[f]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Exercise progression */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>EXERCICES{selectedTemplateId != null ? ` — ${selectedTemplateName}` : ''}</Text>
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
                    <View style={styles.chartCard}>
                      <View style={styles.chartCardHeader}>
                        <Text style={styles.chartCardTitle}>{selectedExercise}</Text>
                        {progressionData.length > 0 && (
                          <View style={styles.recordBadge}>
                            <Text style={styles.recordBadgeText}>
                              Record {Math.max(...progressionData.map((d) => d.value))} kg
                            </Text>
                          </View>
                        )}
                      </View>
                      <LineChart
                        data={progressionData}
                        color={colors.accent}
                        unit=" kg"
                        gradientId="grad_exercise"
                      />
                      {progressionData.length >= 2 && (() => {
                        const diff = progressionData[progressionData.length - 1].value - progressionData[0].value;
                        if (diff === 0) return null;
                        return (
                          <Text style={[styles.delta, { color: diff > 0 ? colors.accent : colors.danger }]}>
                            {diff > 0 ? '↑' : '↓'} {Math.abs(diff)} kg depuis la première séance
                          </Text>
                        );
                      })()}
                    </View>
                  )}
                </View>

                {/* Tonnage par groupe musculaire / semaine */}
                {/* {muscleGroupWeeklyTonnage.some((w) => w.total > 0) && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>TONNAGE PAR GROUPE MUSCULAIRE</Text>
                    <View style={styles.chartCard}>
                      {(() => {
                        const maxTotal = Math.max(...muscleGroupWeeklyTonnage.map((w) => w.total), 1);
                        const activeGroups = MUSCLE_GROUPS.filter((g) =>
                          muscleGroupWeeklyTonnage.some((w) => w.groups.find((wg) => wg.id === g.id))
                        );
                        return (
                          <>
                            {muscleGroupWeeklyTonnage.map((week) => (
                              <View key={week.label} style={styles.weekRow}>
                                <Text style={styles.weekLabel}>{week.label}</Text>
                                <View style={styles.weekBarTrack}>
                                  {week.total > 0 ? (
                                    <View style={[styles.weekBarFill, { width: `${(week.total / maxTotal) * 100}%` as any }]}>
                                      {week.groups.map((g) => (
                                        <View
                                          key={g.id}
                                          style={{ flex: g.volume, backgroundColor: g.color, opacity: 0.85 }}
                                        />
                                      ))}
                                    </View>
                                  ) : (
                                    <View style={styles.weekBarEmpty} />
                                  )}
                                </View>
                                <Text style={styles.weekVolLabel}>
                                  {week.total > 0 ? formatVol(week.total) : '—'}
                                </Text>
                              </View>
                            ))}
                            <View style={styles.weekLegend}>
                              {activeGroups.map((g) => (
                                <View key={g.id} style={styles.legendItem}>
                                  <View style={[styles.legendDot, { backgroundColor: g.color }]} />
                                  <Text style={styles.legendText}>{g.name}</Text>
                                </View>
                              ))}
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                )} */}

                {/* Tonnage per session type */}
                {tonnageData.length >= 2 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      TONNAGE{selectedTemplateId != null ? ` — ${selectedTemplateName}` : ' GLOBAL'}
                    </Text>
                    <View style={styles.chartCard}>
                      <View style={styles.chartCardHeader}>
                        <Text style={styles.chartCardTitle}>
                          {selectedTemplateId != null ? selectedTemplateName : 'Toutes séances'}
                        </Text>
                        {tonnageData.length > 0 && (
                          <Text style={styles.chartCardSub}>
                            {formatVol(tonnageData[tonnageData.length - 1].value)} dernière
                          </Text>
                        )}
                      </View>
                      <LineChart
                        data={tonnageData}
                        color={programAccents[2]}
                        gradientId="grad_tonnage"
                      />
                      {tonnageData.length >= 2 && (() => {
                        const last = tonnageData[tonnageData.length - 1].value;
                        const prev = tonnageData[tonnageData.length - 2].value;
                        const diff = last - prev;
                        if (Math.abs(diff) < 1) return null;
                        return (
                          <Text style={[styles.delta, { color: diff > 0 ? colors.accent : colors.danger }]}>
                            {diff > 0 ? '↑' : '↓'} {formatVol(Math.abs(diff))} vs séance précédente
                          </Text>
                        );
                      })()}
                    </View>
                  </View>
                )}
              </>
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
                  <TextInput style={styles.rmInput} keyboardType="decimal-pad" placeholder="80" placeholderTextColor={colors.textMuted} value={rmWeight} onChangeText={setRmWeight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>REPS</Text>
                  <TextInput style={styles.rmInput} keyboardType="number-pad" placeholder="5" placeholderTextColor={colors.textMuted} value={rmReps} onChangeText={setRmReps} />
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
                      const uses: Record<number, string> = { 100: 'Force max', 95: '1–2 reps', 90: '3–4 reps', 85: 'Puissance 5r', 80: 'Hypertro 6–8r', 75: 'Hypertro 8–10r', 70: 'Endurance 12r', 65: 'Endurance 15r', 60: 'Récupération' };
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
                  {r > 30 ? "La formule est fiable jusqu'à 30 reps max" : 'Saisis un poids et un nombre de répétitions'}
                </Text>
              )}
            </View>

            {exerciseBests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MEILLEURS LIFTS</Text>
                {exerciseBests.map((item, idx) => (
                  <View key={item.name} style={styles.prRow}>
                    <Text style={styles.prMedal}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prName}>{item.name}</Text>
                      <Text style={styles.prDate}>{new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
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

        {/* ── HISTORIQUE ── */}
        {activeTab === 'historique' && (
          <>
            {/* Compact stats */}
            <View style={styles.freqRow}>
              <View style={styles.freqBox}>
                <Text style={styles.freqVal}>{freqStats.streak}</Text>
                <Text style={styles.freqLbl}>Série 🔥</Text>
              </View>
              <View style={styles.freqBox}>
                <Text style={styles.freqVal}>{freqStats.thisWeek}</Text>
                <Text style={styles.freqLbl}>Cette sem.</Text>
              </View>
              <View style={styles.freqBox}>
                <Text style={styles.freqVal}>{completed.length}</Text>
                <Text style={styles.freqLbl}>Total</Text>
              </View>
            </View>

            {/* Heatmap */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ACTIVITÉ — 5 DERNIÈRES SEMAINES</Text>
              <View style={styles.heatmapCard}>
                <Heatmap sessionDates={freqStats.sessionDates} />
              </View>
            </View>

            {/* Sessions grouped by template */}
            {sessionsByTemplate.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>Aucun historique</Text>
                <Text style={styles.emptySub}>Tes séances terminées apparaîtront ici</Text>
              </View>
            ) : (
              sessionsByTemplate.map((group, gIdx) => {
                const accentColor = programAccents[gIdx % programAccents.length];
                return (
                  <View key={group.id} style={styles.section}>
                    <View style={styles.groupHeader}>
                      <View style={[styles.groupDot, { backgroundColor: accentColor }]} />
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupCount}>{group.sessions.length} séance{group.sessions.length > 1 ? 's' : ''}</Text>
                    </View>

                    {group.sessions.map((session, sIdx) => {
                      const stats = sessionStats.get(session.id) ?? { volume: 0, doneSets: 0, totalSets: 0 };
                      const vol = stats.volume;
                      const { doneSets, totalSets } = stats;
                      const prevStats = sIdx < group.sessions.length - 1
                        ? sessionStats.get(group.sessions[sIdx + 1].id)
                        : null;
                      const delta = prevStats != null ? vol - prevStats.volume : null;

                      return (
                        <TouchableOpacity
                          key={session.id}
                          style={styles.historyCard}
                          onPress={() => router.push(`/history/${session.id}`)}
                          activeOpacity={0.85}
                        >
                          <View style={[styles.historyAccent, { backgroundColor: accentColor }]} />
                          <View style={styles.historyBody}>
                            <View style={styles.historyTop}>
                              <Text style={styles.historyDate}>
                                {new Date(session.date).toLocaleDateString('fr-FR', {
                                  weekday: 'short', day: 'numeric', month: 'short',
                                })}
                              </Text>
                              <Text style={styles.historyChevron}>›</Text>
                            </View>
                            <View style={styles.historyBottom}>
                              <Text style={styles.historyMeta}>
                                {doneSets}/{totalSets} séries
                              </Text>
                              {vol > 0 && (
                                <View style={styles.historyVolRow}>
                                  <Text style={[styles.historyVol, { color: accentColor }]}>
                                    {formatVol(vol)}
                                  </Text>
                                  {delta != null && Math.abs(delta) >= 10 && (
                                    <View style={[
                                      styles.deltaBadge,
                                      { backgroundColor: delta > 0 ? '#0f2318' : '#2a1515' },
                                    ]}>
                                      <Text style={[
                                        styles.deltaBadgeText,
                                        { color: delta > 0 ? colors.accent : colors.danger },
                                      ]}>
                                        {delta > 0 ? '↑' : '↓'} {formatVol(Math.abs(delta))}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })
            )}
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
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: colors.accent },
  tabBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabBtnTextActive: { color: colors.accent, fontWeight: '800' },

  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  chartSub: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },

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

  chartCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  chartCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  chartCardTitle: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  chartCardSub: { color: colors.textMuted, fontSize: 12 },
  recordBadge: {
    backgroundColor: '#1f1a00',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  recordBadgeText: { color: '#f59e0b', fontSize: 10, fontWeight: '800' },
  delta: { fontSize: 12, fontWeight: '700' },

  timeFilterRow: { flexDirection: 'row', gap: spacing.xs },
  timeFilterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  timeFilterBtnActive: { borderColor: colors.accent, backgroundColor: '#0f2318' },
  timeFilterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  timeFilterTextActive: { color: colors.accent },

  // 1RM
  inputLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
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
  percentTable: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden', marginTop: spacing.sm },
  percentTableHeader: { flexDirection: 'row', backgroundColor: colors.surface2, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  percentCell: { flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  percentRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  percentPct: { flex: 1, color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  percentKg: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  percentUse: { color: colors.textMuted, fontSize: 12 },

  // PRs
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface1, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.divider },
  prMedal: { fontSize: 20, width: 28, textAlign: 'center' },
  prName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  prDate: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  prBadge: { alignItems: 'flex-end' },
  prWeight: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  prRm: { color: colors.textMuted, fontSize: 10, marginTop: 1 },

  // Historique
  freqRow: { flexDirection: 'row', gap: spacing.sm },
  freqBox: { flex: 1, backgroundColor: colors.surface1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.divider },
  freqVal: { color: colors.accent, fontSize: 22, fontWeight: '900' },
  freqLbl: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' },

  heatmapCard: { backgroundColor: colors.surface1, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.divider },

  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupName: { color: colors.text, fontSize: 15, fontWeight: '800', flex: 1 },
  groupCount: { color: colors.textMuted, fontSize: 12 },

  historyCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  historyAccent: { width: 3 },
  historyBody: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  historyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyDate: { color: colors.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  historyChevron: { color: colors.textMuted, fontSize: 20, fontWeight: '300' },
  historyBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  historyMeta: { color: colors.textMuted, fontSize: 11 },
  historyVolRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyVol: { fontSize: 13, fontWeight: '800' },
  deltaBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  deltaBadgeText: { fontSize: 10, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },

  // Tonnage par groupe musculaire
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  weekLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', width: 38 },
  weekBarTrack: { flex: 1, height: 18, backgroundColor: colors.surface2, borderRadius: 4, overflow: 'hidden' },
  weekBarFill: { height: '100%', flexDirection: 'row', borderRadius: 4, overflow: 'hidden' },
  weekBarEmpty: { width: '4%', height: '100%', backgroundColor: colors.divider, borderRadius: 4 },
  weekVolLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', width: 44, textAlign: 'right' },
  weekLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 11 },
});
