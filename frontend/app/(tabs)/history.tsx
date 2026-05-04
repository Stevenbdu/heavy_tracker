import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, WorkoutSession } from '@/lib/api';
import { colors, radius, spacing, programAccents } from '@/lib/theme';
import { EXERCISES, MUSCLE_GROUPS, inferGroup } from '@/lib/exercises';
import { LineChart, MultiLineChart, ChartPoint, MLDataset } from '@/components/charts';
import { RadialRing } from '@/components/RadialRing';
import { DayList, DayLevel } from '@/components/DayList';
import { WeekHistoryStrip } from '@/components/WeekHistoryStrip';
import { BodyTab } from '@/components/BodyTab';

// ── Helpers ───────────────────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────
type Tab = 'progression' | 'historique' | 'records' | 'corps';
type SessionStats = { volume: number; doneSets: number; totalSets: number };
type SessionGroup = { id: number; name: string; sessions: WorkoutSession[] };

// ── Main screen ───────────────────────────────────────────────────
export default function StatsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('progression');

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'30d' | '3m' | '6m' | 'all'>('all');
  const [rmWeight, setRmWeight] = useState('');
  const [rmReps, setRmReps] = useState('');
  const [activeMgIds, setActiveMgIds] = useState<string[]>(MUSCLE_GROUPS.map((g) => g.id));
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const weekIndexInitialized = useRef(false);

  const load = useCallback(async () => {
    try {
      const [data, programs] = await Promise.all([api.sessions.history(), api.programs.list()]);
      setSessions(data);
      const active = programs.find((p) => p.isActive);
      if (active) setWeeklyTarget(active.templates.length || 3);
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
    const map = new Map<number, SessionStats>();
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

  // ── Progression tab ────────────────────────────────────────────

  const templates = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    completed.forEach((s) => {
      if (!map.has(s.workoutTemplate.id))
        map.set(s.workoutTemplate.id, { id: s.workoutTemplate.id, name: s.workoutTemplate.name });
    });
    return [...map.values()];
  }, [completed]);

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

  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    filteredSessions.forEach((s) => s.loggedExercises.forEach((e) => names.add(e.name)));
    return [...names].sort();
  }, [filteredSessions]);

  const handleSelectTemplate = (id: number | null) => {
    setSelectedTemplateId(id);
    setSelectedExercise(null);
  };

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

  const tonnageData = useMemo((): ChartPoint[] => {
    return filteredSessions
      .slice(0, 12).reverse()
      .map((s) => ({ label: shortDate(s.date), value: sessionStats.get(s.id)?.volume ?? 0 }))
      .filter((d) => d.value > 0);
  }, [filteredSessions, sessionStats]);

  // ── Records tab ────────────────────────────────────────────────

  const exerciseBests = useMemo(() => {
    const map = new Map<string, { weight: number; reps: number; date: string }>();
    completed.forEach((s) => {
      s.loggedExercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          if (!set.completed || set.actualWeight == null) return;
          const prev = map.get(ex.name);
          if (!prev || set.actualWeight > prev.weight)
            map.set(ex.name, { weight: set.actualWeight, reps: set.actualReps ?? 0, date: s.date });
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

  // ── Historique tab ─────────────────────────────────────────────

  const sessionsByTemplate = useMemo(() => {
    const map = new Map<number, SessionGroup>();
    completed.forEach((s) => {
      const tid = s.workoutTemplate.id;
      if (!map.has(tid))
        map.set(tid, { id: tid, name: s.workoutTemplate.name, sessions: [] });
      map.get(tid)!.sessions.push(s);
    });
    map.forEach((g) => g.sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return [...map.values()].sort(
      (a, b) => new Date(b.sessions[0].date).getTime() - new Date(a.sessions[0].date).getTime()
    );
  }, [completed]);

  const muscleGroupWeeklyTonnage = useMemo(() => {
    const exGroup = new Map<string, string>(EXERCISES.map((e) => [e.name, e.muscleGroup]));
    const weekStart = (d: Date) => {
      const r = new Date(d);
      r.setHours(0, 0, 0, 0);
      r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
      return r;
    };
    if (completed.length === 0) return [];
    const firstDate = completed.reduce((min, s) => {
      const d = new Date(s.date);
      return d < min ? d : min;
    }, new Date(completed[0].date));
    const start = weekStart(firstDate);
    const today = weekStart(new Date());
    const weeks: Date[] = [];
    const cur = new Date(start);
    while (cur <= today) {
      weeks.push(new Date(cur));
      cur.setDate(cur.getDate() + 7);
    }
    const weekMap = new Map<number, Map<string, number>>(weeks.map((wk) => [wk.getTime(), new Map()]));
    completed.forEach((s) => {
      const sw = weekStart(new Date(s.date));
      const entry = weekMap.get(sw.getTime());
      if (!entry) return;
      s.loggedExercises.forEach((ex) => {
        const group = exGroup.get(ex.name) ?? inferGroup(ex.name);
        if (!group) return;
        ex.sets.forEach((set) => {
          if (set.completed && set.actualWeight != null && set.actualReps != null)
            entry.set(group, (entry.get(group) ?? 0) + set.actualWeight * set.actualReps);
        });
      });
    });
    return weeks.map((wk) => {
      const entry = weekMap.get(wk.getTime())!;
      const groups = MUSCLE_GROUPS.map((g) => ({ ...g, volume: entry.get(g.id) ?? 0 })).filter((g) => g.volume > 0);
      return { label: `${wk.getDate()}/${wk.getMonth() + 1}`, groups, total: groups.reduce((s, g) => s + g.volume, 0) };
    });
  }, [completed]);

  const mgChartDatasets = useMemo((): MLDataset[] => {
    return MUSCLE_GROUPS.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      points: muscleGroupWeeklyTonnage.map((wk) => ({
        label: wk.label,
        value: wk.groups.find((wg) => wg.id === g.id)?.volume ?? 0,
      })),
    })).filter((d) => d.points.some((p) => p.value > 0));
  }, [muscleGroupWeeklyTonnage]);


  const weekStats = useMemo(() => {
    if (completed.length === 0) return [];
    const getMondayOf = (date: Date) => {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d;
    };
    const toKey = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const currentMonday = getMondayOf(today);
    const firstMonday = getMondayOf(completed.reduce((min, s) => {
      const d = new Date(s.date); return d < min ? d : min;
    }, new Date(completed[0].date)));
    const map = new Map<string, { monday: Date; days: boolean[]; names: (string | null)[]; ids: (number | null)[] }>();
    const cur = new Date(firstMonday);
    while (cur <= currentMonday) {
      map.set(toKey(cur), { monday: new Date(cur), days: Array(7).fill(false), names: Array(7).fill(null), ids: Array(7).fill(null) });
      cur.setDate(cur.getDate() + 7);
    }
    completed.forEach((s) => {
      const d = new Date(s.date);
      const week = map.get(toKey(getMondayOf(d)));
      if (!week) return;
      const idx = (d.getDay() + 6) % 7;
      week.days[idx] = true;
      if (!week.names[idx]) week.names[idx] = s.workoutTemplate?.name ?? null;
      if (!week.ids[idx]) week.ids[idx] = s.id;
    });
    return [...map.values()].map(({ monday, days, names, ids }) => {
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return {
        isoWeek: toKey(monday), startDate: toKey(monday), endDate: toKey(sunday),
        days: days.map((d) => (d ? 1 : 0)) as DayLevel[],
        sessionNames: names,
        sessionIds: ids,
      };
    });
  }, [completed]);

  // initialize selectedWeekIndex to current week when data loads
  if (!weekIndexInitialized.current && weekStats.length > 0) {
    weekIndexInitialized.current = true;
    setSelectedWeekIndex(weekStats.length - 1);
  }

  const selectedWeek = weekStats[selectedWeekIndex] ?? null;
  const isCurrentWeek = selectedWeekIndex === weekStats.length - 1;
  const today2 = new Date(); today2.setHours(0, 0, 0, 0);
  const todayDayIndex = isCurrentWeek ? (today2.getDay() + 6) % 7 : null;
  const weekDone = selectedWeek ? selectedWeek.days.filter((d) => d === 1).length : 0;
  const weekLabel = weekStats.length === 0 || isCurrentWeek ? 'CETTE SEM.' : `S-${weekStats.length - 1 - selectedWeekIndex}`;

  const stripWeeks = weekStats.map((w, i) => ({
    isoWeek: w.isoWeek,
    done: w.days.filter((d) => d === 1).length,
    target: weeklyTarget,
    label: i === weekStats.length - 1 ? 'Cette' : `S-${weekStats.length - 1 - i}`,
  }));

  const weekStreak = (() => {
    let s = 0;
    for (let i = weekStats.length - 1; i >= 0; i--) {
      if (weekStats[i].days.filter((d) => d === 1).length >= weeklyTarget) s++;
      else break;
    }
    return s;
  })();

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
      <View style={styles.tabBar}>
        {(['progression', 'historique', 'records', 'corps'] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = { progression: 'Progression', historique: 'Activité', records: 'Records', corps: 'Corps' };
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
          completed.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>Aucune donnée</Text>
              <Text style={styles.emptySub}>Termine des séances pour voir ta progression</Text>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TYPE DE SÉANCE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.xs }}>
                    <TouchableOpacity
                      style={[styles.chip, selectedTemplateId == null && styles.chipActive]}
                      onPress={() => handleSelectTemplate(null)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selectedTemplateId == null && styles.chipTextActive]}>Tout</Text>
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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  EXERCICES{selectedTemplateId != null ? ` — ${selectedTemplateName}` : ''}
                </Text>
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
                    <LineChart data={progressionData} color={colors.accent} unit=" kg" gradientId="grad_exercise" showRecord />
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

              {mgChartDatasets.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>TONNAGE PAR GROUPE MUSCULAIRE</Text>
                  <TonnageSection
                    datasets={mgChartDatasets}
                    activeIds={activeMgIds}
                    onToggle={(id, val) =>
                      setActiveMgIds((prev) => val ? [...prev, id] : prev.filter((x) => x !== id))
                    }
                  />
                </View>
              )}

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
                      <Text style={styles.chartCardSub}>{formatVol(tonnageData[tonnageData.length - 1].value)} dernière</Text>
                    </View>
                    <LineChart data={tonnageData} color={programAccents[2]} gradientId="grad_tonnage" />
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
          )
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

            {exerciseBests.length > 0 ? (
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
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>Aucun record</Text>
                <Text style={styles.emptySub}>Termine des séances pour voir tes records</Text>
              </View>
            )}
          </>
        )}

        {/* ── ACTIVITÉ ── */}
        {activeTab === 'historique' && (
          <>
            <View style={styles.freqRow}>
              <View style={styles.freqBox}>
                <Text style={styles.freqVal}>{weekStreak} 🔥</Text>
                <Text style={styles.freqLbl}>Streak sem.</Text>
              </View>
              <View style={styles.freqBox}>
                <Text style={styles.freqVal}>{completed.length}</Text>
                <Text style={styles.freqLbl}>Total</Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: '#1a1a1a', borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 16 }]}>
              <Text style={[styles.sectionTitle, { color: '#00E87A', marginBottom: 16 }]}>{weekLabel}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <RadialRing done={weekDone} target={weeklyTarget} size={120} strokeWidth={11} />
                {selectedWeek && (
                  <DayList
                    days={selectedWeek.days}
                    todayIndex={todayDayIndex}
                    sessionNames={selectedWeek.sessionNames}
                    sessionIds={selectedWeek.sessionIds}
                    onPressSession={(sid) => router.push(`/history/${sid}`)}
                  />
                )}
              </View>
            </View>

            <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 4 }]}>HISTORIQUE</Text>
            <WeekHistoryStrip
              weeks={stripWeeks}
              selectedIndex={selectedWeekIndex}
              onSelect={setSelectedWeekIndex}
            />

            <SessionList
              groups={sessionsByTemplate}
              sessionStats={sessionStats}
              onPress={(id) => router.push(`/history/${id}`)}
            />
          </>
        )}
        {/* ── CORPS ── */}
        {activeTab === 'corps' && <BodyTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── TonnageSection ────────────────────────────────────────────────
function TonnageSection({
  datasets,
  activeIds,
  onToggle,
}: {
  datasets: MLDataset[];
  activeIds: string[];
  onToggle: (id: string, val: boolean) => void;
}) {
  const activeVals = datasets
    .filter((d) => activeIds.includes(d.id))
    .flatMap((d) => d.points.map((p) => p.value))
    .filter((v) => v > 0);
  const picDeCharge = activeVals.length > 0 ? Math.max(...activeVals) : 0;
  const moyenne = activeVals.length > 0
    ? Math.round(activeVals.reduce((a, b) => a + b, 0) / activeVals.length)
    : 0;

  return (
    <View style={styles.chartCard}>
      <View style={styles.mgStatsRow}>
        <View style={styles.mgStatBox}>
          <Text style={styles.mgStatValue}>{formatVol(picDeCharge)}</Text>
          <Text style={styles.mgStatLabel}>PIC DE CHARGE</Text>
        </View>
        <View style={[styles.mgStatBox, { borderLeftWidth: 1, borderLeftColor: colors.divider }]}>
          <Text style={styles.mgStatValue}>{formatVol(moyenne)}</Text>
          <Text style={styles.mgStatLabel}>MOYENNE</Text>
        </View>
        <View style={[styles.mgStatBox, { borderLeftWidth: 1, borderLeftColor: colors.divider }]}>
          <Text style={styles.mgStatValue}>6 Semaines</Text>
          <Text style={styles.mgStatLabel}>PÉRIODE</Text>
        </View>
      </View>
      <MultiLineChart datasets={datasets} activeIds={activeIds} height={200} />
      <View style={styles.mgToggleGrid}>
        {datasets.map((d) => {
          const isOn = activeIds.includes(d.id);
          return (
            <View key={d.id} style={styles.mgToggleRow}>
              <Text style={[styles.mgToggleName, { color: isOn ? d.color : colors.textMuted }]}>
                {d.name}
              </Text>
              <Switch
                value={isOn}
                onValueChange={(val) => onToggle(d.id, val)}
                trackColor={{ false: colors.surface2, true: d.color + '55' }}
                thumbColor={isOn ? d.color : colors.divider}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── SessionList ───────────────────────────────────────────────────
function SessionList({
  groups,
  sessionStats,
  onPress,
}: {
  groups: SessionGroup[];
  sessionStats: Map<number, SessionStats>;
  onPress: (id: number) => void;
}) {
  if (groups.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>Aucun historique</Text>
        <Text style={styles.emptySub}>Tes séances terminées apparaîtront ici</Text>
      </View>
    );
  }

  return (
    <>
      {groups.map((group, gIdx) => {
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
              const { volume: vol, doneSets, totalSets } = stats;
              const prevStats = sIdx < group.sessions.length - 1
                ? sessionStats.get(group.sessions[sIdx + 1].id)
                : null;
              const delta = prevStats != null ? vol - prevStats.volume : null;
              return (
                <TouchableOpacity
                  key={session.id}
                  style={styles.historyCard}
                  onPress={() => onPress(session.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.historyAccent, { backgroundColor: accentColor }]} />
                  <View style={styles.historyBody}>
                    <View style={styles.historyTop}>
                      <Text style={styles.historyDate}>
                        {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.historyChevron}>›</Text>
                    </View>
                    <View style={styles.historyBottom}>
                      <Text style={styles.historyMeta}>{doneSets}/{totalSets} séries</Text>
                      {vol > 0 && (
                        <View style={styles.historyVolRow}>
                          <Text style={[styles.historyVol, { color: accentColor }]}>{formatVol(vol)}</Text>
                          {delta != null && Math.abs(delta) >= 10 && (
                            <View style={[styles.deltaBadge, { backgroundColor: delta > 0 ? '#0f2318' : '#2a1515' }]}>
                              <Text style={[styles.deltaBadgeText, { color: delta > 0 ? colors.accent : colors.danger }]}>
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
      })}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────
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

  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface1, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.divider },
  prMedal: { fontSize: 20, width: 28, textAlign: 'center' },
  prName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  prDate: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  prBadge: { alignItems: 'flex-end' },
  prWeight: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  prRm: { color: colors.textMuted, fontSize: 10, marginTop: 1 },

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

  mgStatsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: spacing.sm },
  mgStatBox: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, alignItems: 'center' },
  mgStatValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  mgStatLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginTop: 2 },
  mgToggleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.sm },
  mgToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mgToggleName: { fontSize: 12, fontWeight: '600' },
});
