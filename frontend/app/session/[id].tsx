import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api, WorkoutSession, LoggedSet } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';
import { EXERCISES, MUSCLE_GROUPS } from '@/lib/exercises';
import { confirmAlert, infoAlert } from '@/lib/alert';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getMuscleLabel(exerciseName: string): string | null {
  const ex = EXERCISES.find(
    (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  if (!ex) return null;
  return MUSCLE_GROUPS.find((g) => g.id === ex.muscleGroup)?.name ?? null;
}

type ModalSet = {
  id?: number;
  setNumber: number;
  weight: number;
  reps: number;
};

type SummaryData = {
  volume: number;
  doneSets: number;
  totalSets: number;
  prBeaten: string[];
  sessionId: number;
};

export default function SessionScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [started, setStarted] = useState(fresh !== '1');
  const [elapsed, setElapsed] = useState(0);

  // Multi-set modal
  const [modalExercise, setModalExercise] = useState<{
    id: number;
    name: string;
    muscleGroup: string | null;
    pr: number | null;
  } | null>(null);
  const [modalSets, setModalSets] = useState<ModalSet[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [modalSaving, setModalSaving] = useState(false);

  // Summary overlay
  const [summary, setSummary] = useState<SummaryData | null>(null);

  // Exercise PRs (loaded in background)
  const [exercisePRs, setExercisePRs] = useState<Map<string, number>>(new Map());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.sessions.get(Number(id));
      setSession(data);
    } catch {
      infoAlert('Erreur', 'Impossible de charger la séance');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Load PRs in background
  useEffect(() => {
    api.sessions.history().then((history) => {
      const prMap = new Map<string, number>();
      history
        .filter((s) => s.status === 'completed')
        .forEach((s) => {
          s.loggedExercises.forEach((ex) => {
            ex.sets.forEach((set) => {
              if (!set.completed || set.actualWeight == null) return;
              const cur = prMap.get(ex.name) ?? 0;
              if (set.actualWeight > cur) prMap.set(ex.name, set.actualWeight);
            });
          });
        });
      setExercisePRs(prMap);
    }).catch(() => {});
  }, []);

  // Timer
  useEffect(() => {
    if (!session || session.status !== 'in_progress' || !started) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - new Date(session.date).getTime()) / 1000));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.date, session?.status, started]);

  const openModal = (exercise: { id: number; name: string; sets: LoggedSet[] }) => {
    const pr = exercisePRs.get(exercise.name) ?? null;
    setModalExercise({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: getMuscleLabel(exercise.name),
      pr,
    });
    setModalSets(
      exercise.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        weight: s.actualWeight ?? s.targetWeight,
        reps: s.actualReps ?? s.targetReps,
      }))
    );
    setDeletedIds([]);
  };

  const addModalSet = () => {
    const last = modalSets[modalSets.length - 1];
    setModalSets((prev) => [
      ...prev,
      {
        setNumber: prev.length + 1,
        weight: last?.weight ?? 0,
        reps: last?.reps ?? 8,
      },
    ]);
  };

  const removeModalSet = (idx: number) => {
    const set = modalSets[idx];
    if (set.id) setDeletedIds((prev) => [...prev, set.id!]);
    setModalSets((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((s, i) => ({ ...s, setNumber: i + 1 }));
    });
  };

  const updateModalSet = (idx: number, field: 'weight' | 'reps', delta: number) => {
    setModalSets((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        if (field === 'weight') {
          return { ...s, weight: Math.max(0, Math.round((s.weight + delta) * 10) / 10) };
        }
        return { ...s, reps: Math.max(1, s.reps + delta) };
      })
    );
  };

  const handleModalSave = async () => {
    if (!modalExercise) return;
    setModalSaving(true);
    try {
      // Delete removed sets
      if (deletedIds.length > 0) {
        await Promise.all(
          deletedIds.map((setId) =>
            api.sessions.deleteSet(Number(id), modalExercise.id, setId)
          )
        );
      }

      // Update existing sets
      const existing = modalSets.filter((s) => s.id);
      await Promise.all(
        existing.map((s) =>
          api.sessions.logSet(Number(id), modalExercise.id, s.id!, {
            actualWeight: s.weight,
            actualReps: s.reps,
            completed: true,
          })
        )
      );

      // Create new sets (sequentially to preserve order)
      const newSets = modalSets.filter((s) => !s.id);
      for (const s of newSets) {
        await api.sessions.addSet(Number(id), modalExercise.id, {
          targetWeight: s.weight,
          targetReps: s.reps,
          actualWeight: s.weight,
          actualReps: s.reps,
        });
      }

      await load();
      setModalExercise(null);
    } catch {
      infoAlert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setModalSaving(false);
    }
  };

  const handleComplete = () => {
    confirmAlert(
      'Terminer la séance ?',
      'La séance sera marquée comme complétée.',
      async () => {
        setCompleting(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        try {
          const [completedSession, history] = await Promise.all([
            api.sessions.complete(Number(id)),
            api.sessions.history(),
          ]);

          const prevSessions = history.filter(
            (s) => s.id !== Number(id) && s.status === 'completed'
          );
          const prBeaten: string[] = [];
          completedSession.loggedExercises.forEach((ex) => {
            const myBest = ex.sets
              .filter((s) => s.completed && s.actualWeight != null)
              .reduce((max, s) => Math.max(max, s.actualWeight!), 0);
            if (myBest <= 0) return;
            let prevBest = 0;
            prevSessions.forEach((sess) => {
              sess.loggedExercises
                .filter((e) => e.name === ex.name)
                .forEach((e) => {
                  const b = e.sets
                    .filter((s) => s.completed && s.actualWeight != null)
                    .reduce((m, s) => Math.max(m, s.actualWeight!), 0);
                  if (b > prevBest) prevBest = b;
                });
            });
            if (myBest > prevBest) prBeaten.push(`${ex.name} — ${myBest} kg`);
          });

          const volume = completedSession.loggedExercises.reduce(
            (t, ex) =>
              t +
              ex.sets.reduce(
                (s, set) =>
                  s + (set.completed ? (set.actualWeight ?? 0) * (set.actualReps ?? 0) : 0),
                0
              ),
            0
          );
          const doneSets = completedSession.loggedExercises.reduce(
            (t, ex) => t + ex.sets.filter((s) => s.completed).length, 0
          );
          const totalSets = completedSession.loggedExercises.reduce(
            (t, ex) => t + ex.sets.length, 0
          );
          setSummary({ volume, doneSets, totalSets, prBeaten, sessionId: Number(id) });
        } catch {
          infoAlert('Erreur', 'Impossible de terminer la séance');
          router.replace('/');
        } finally {
          setCompleting(false);
        }
      },
      'Terminer ✓'
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session) return null;

  const totalSets = session.loggedExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const doneSets = session.loggedExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0
  );
  const progressPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const progress = totalSets > 0 ? doneSets / totalSets : 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        {/* Custom header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {session.workoutTemplate.name}
          </Text>
          {started ? (
            <View style={styles.timerChip}>
              <Feather name="clock" size={12} color={colors.accent} />
              <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
            </View>
          ) : (
            <View style={{ width: 70 }} />
          )}
        </View>

        {/* Progress bar + counter */}
        <View style={styles.progressRow}>
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressCounter}>{doneSets}/{totalSets} séries</Text>
        </View>

        {/* Exercise list */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {session.loggedExercises.map((exercise, idx) => {
            const allDone = exercise.sets.length > 0 && exercise.sets.every((s) => s.completed);
            const pr = exercisePRs.get(exercise.name) ?? null;
            const muscleLabel = getMuscleLabel(exercise.name);
            const subtitle = [muscleLabel, pr ? `PR ${pr}kg` : null]
              .filter(Boolean)
              .join(' · ');

            return (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  {/* Number / check badge */}
                  <View style={[styles.numBadge, allDone && styles.numBadgeDone]}>
                    {allDone
                      ? <Feather name="check" size={14} color={colors.accent} />
                      : <Text style={styles.numText}>{idx + 1}</Text>
                    }
                  </View>

                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {subtitle ? (
                      <Text style={styles.exerciseSub}>{subtitle}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[styles.saisirBtn, allDone && styles.modifBtn]}
                    onPress={() => openModal(exercise)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.saisirBtnText, allDone && styles.modifBtnText]}>
                      {allDone ? 'Modif.' : 'Saisir'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Set chips */}
                {exercise.sets.length > 0 && (
                  <View style={styles.chipsRow}>
                    {exercise.sets.map((set) => {
                      const hasWeight = (set.actualWeight ?? set.targetWeight) > 0;
                      const weight = set.actualWeight ?? set.targetWeight;
                      const reps = set.actualReps ?? set.targetReps;
                      return (
                        <View
                          key={set.id}
                          style={[styles.setChip, set.completed && styles.setChipDone]}
                        >
                          <Text style={[styles.setChipText, set.completed && styles.setChipTextDone]}>
                            {hasWeight ? `${weight}kg ×${reps}` : `×${reps}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {!started ? (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => setStarted(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>COMMENCER LA SÉANCE ▶</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.completeBtn, completing && { opacity: 0.6 }]}
              onPress={handleComplete}
              disabled={completing}
              activeOpacity={0.8}
            >
              {completing ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.completeBtnText}>
                  Terminer ({progressPct}% complété)
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Multi-set Modal */}
        <Modal
          visible={modalExercise !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setModalExercise(null)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setModalExercise(null)}
              />
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />

                {/* Modal header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{modalExercise?.name}</Text>
                    {(modalExercise?.muscleGroup || modalExercise?.pr) && (
                      <Text style={styles.modalSub}>
                        {[modalExercise.muscleGroup, modalExercise.pr ? `PR ${modalExercise.pr} kg` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalExercise(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Column headers */}
                <View style={styles.modalColHeaders}>
                  <Text style={[styles.modalColHeader, { width: 24 }]}>#</Text>
                  <Text style={[styles.modalColHeader, { flex: 1 }]}>POIDS (kg)</Text>
                  <Text style={[styles.modalColHeader, { flex: 1 }]}>REPS</Text>
                  <View style={{ width: 28 }} />
                </View>

                {/* Set rows */}
                <ScrollView
                  style={styles.modalSetsScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {modalSets.map((set, idx) => (
                    <View key={idx} style={styles.modalSetRow}>
                      <Text style={styles.modalSetNum}>{set.setNumber}</Text>

                      {/* Weight stepper */}
                      <View style={styles.stepperInline}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => updateModalSet(idx, 'weight', -2.5)}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{set.weight}</Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => updateModalSet(idx, 'weight', 2.5)}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Reps stepper */}
                      <View style={styles.stepperInline}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => updateModalSet(idx, 'reps', -1)}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{set.reps}</Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => updateModalSet(idx, 'reps', 1)}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Delete row */}
                      <TouchableOpacity
                        style={styles.deleteRowBtn}
                        onPress={() => removeModalSet(idx)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather name="trash-2" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                {/* Add set */}
                <TouchableOpacity style={styles.addSetBtn} onPress={addModalSet} activeOpacity={0.7}>
                  <Text style={styles.addSetBtnText}>+ Ajouter une série</Text>
                </TouchableOpacity>

                {/* Save */}
                <TouchableOpacity
                  style={[styles.saveBtn, modalSaving && { opacity: 0.6 }]}
                  onPress={handleModalSave}
                  disabled={modalSaving || modalSets.length === 0}
                  activeOpacity={0.8}
                >
                  {modalSaving ? (
                    <ActivityIndicator color={colors.accentText} />
                  ) : (
                    <Text style={styles.saveBtnText}>✓ Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Summary overlay */}
        <Modal visible={summary !== null} transparent animationType="fade">
          <View style={styles.summaryOverlay}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryEmoji}>🎉</Text>
              <Text style={styles.summaryTitle}>SÉANCE TERMINÉE</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatValue}>
                    {summary && summary.volume >= 1000
                      ? `${(summary.volume / 1000).toFixed(1)}t`
                      : `${summary?.volume ?? 0} kg`}
                  </Text>
                  <Text style={styles.summaryStatLabel}>Volume</Text>
                </View>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatValue}>
                    {summary?.doneSets}/{summary?.totalSets}
                  </Text>
                  <Text style={styles.summaryStatLabel}>Séries</Text>
                </View>
                <View style={styles.summaryStatBox}>
                  <Text style={styles.summaryStatValue}>{formatTime(elapsed)}</Text>
                  <Text style={styles.summaryStatLabel}>Durée</Text>
                </View>
              </View>
              {summary && summary.prBeaten.length > 0 && (
                <View style={styles.prBlock}>
                  <Text style={styles.prBlockTitle}>RECORDS BATTUS 🏆</Text>
                  {summary.prBeaten.map((pr, i) => (
                    <View key={i} style={styles.prRow}>
                      <Text>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</Text>
                      <Text style={styles.prText}>{pr}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.summaryActions}>
                <TouchableOpacity
                  style={styles.summarySecondaryBtn}
                  onPress={() => {
                    const sid = summary?.sessionId;
                    setSummary(null);
                    router.replace('/');
                    if (sid) setTimeout(() => router.push(`/history/${sid}`), 150);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.summarySecondaryText}>Voir le détail</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.summaryPrimaryBtn}
                  onPress={() => { setSummary(null); router.replace('/'); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.summaryPrimaryText}>Accueil</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f2318',
    borderRadius: radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.accent + '50',
  },
  timerText: { color: colors.accent, fontSize: 13, fontWeight: '700' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  progressBarOuter: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  progressCounter: { color: colors.textMuted, fontSize: 11, fontWeight: '600', minWidth: 60, textAlign: 'right' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, gap: spacing.sm },

  exerciseCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    flexShrink: 0,
  },
  numBadgeDone: {
    backgroundColor: '#0f2318',
    borderColor: colors.accent + '50',
  },
  numText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  exerciseSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },

  saisirBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  saisirBtnText: { color: colors.accentText, fontSize: 13, fontWeight: '800' },
  modifBtn: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.divider },
  modifBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  setChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.xs,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  setChipDone: { backgroundColor: '#0f2318', borderColor: colors.accent + '50' },
  setChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  setChipTextDone: { color: colors.accent },

  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startBtnText: { color: colors.accentText, fontSize: 15, fontWeight: '800' },
  completeBtn: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  completeBtnText: { color: colors.text, fontSize: 15, fontWeight: '700' },

  // Multi-set modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  modalSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  modalColHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.xs,
  },
  modalColHeader: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  modalSetsScroll: { maxHeight: 280 },
  modalSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalSetNum: {
    width: 24,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepperInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  stepBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  stepValue: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  deleteRowBtn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addSetBtn: {
    marginTop: spacing.sm,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
  },
  addSetBtnText: { color: colors.accent, fontSize: 14, fontWeight: '600' },

  saveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: colors.accentText, fontSize: 15, fontWeight: '800' },

  // Summary
  summaryOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  summaryEmoji: { fontSize: 48 },
  summaryTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  summaryStats: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  summaryStatBox: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  summaryStatValue: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  summaryStatLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  prBlock: {
    width: '100%',
    backgroundColor: '#0f2318',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  prBlockTitle: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prText: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  summaryActions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  summarySecondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  summarySecondaryText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  summaryPrimaryBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  summaryPrimaryText: { color: colors.accentText, fontSize: 14, fontWeight: '700' },
});
