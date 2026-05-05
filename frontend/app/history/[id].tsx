import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api, WorkoutSession } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';
import { sessionVolume, formatVolume } from '@/lib/utils';
import { useAsyncLoad } from '@/hooks/useAsyncLoad';
import { confirmAlert } from '@/lib/alert';

type LoadedData = { session: WorkoutSession; prevSession: WorkoutSession | null };

export default function SessionHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, loading } = useAsyncLoad<LoadedData>(async () => {
    const [sess, history] = await Promise.all([
      api.sessions.get(Number(id)),
      api.sessions.history(),
    ]);
    const others = history
      .filter((s) => s.id !== Number(id) && s.workoutTemplate.id === sess.workoutTemplate.id && s.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const prev = others.find((s) => new Date(s.date) < new Date(sess.date)) ?? null;
    return { session: sess, prevSession: prev };
  }, [id]);

  const handleDelete = () => {
    confirmAlert(
      'Supprimer cette séance ?',
      'Cette action est irréversible.',
      async () => {
        try {
          await api.sessions.delete(Number(id));
          router.back();
        } catch {
          // silencieux
        }
      },
      'Supprimer'
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const session = data?.session ?? null;
  if (!session) return null;

  const prevSession = data?.prevSession ?? null;
  const totalSets = session.loggedExercises.reduce((a, ex) => a + ex.sets.length, 0);
  const doneSets = session.loggedExercises.reduce(
    (a, ex) => a + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalVolume = sessionVolume(session);
  const prevVolume = prevSession ? sessionVolume(prevSession) : null;
  const volumeDelta = prevVolume != null ? totalVolume - prevVolume : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* En-tête */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionName}>{session.workoutTemplate.name}</Text>
              <Text style={styles.programName}>{session.workoutTemplate.program.name}</Text>
              <Text style={styles.date}>
                {new Date(session.date).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
            <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="trash-2" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats chips */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>{session.loggedExercises.length}</Text>
            <Text style={styles.chipLabel}>Exercices</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>{doneSets}/{totalSets}</Text>
            <Text style={styles.chipLabel}>Séries</Text>
          </View>
          <View style={[styles.chip, styles.chipAccent]}>
            <View style={styles.chipVolumeRow}>
              <Text style={[styles.chipValue, { color: colors.accent }]}>
                {formatVolume(totalVolume)}
              </Text>
              {volumeDelta != null && Math.abs(volumeDelta) > 0 && (
                <View style={[
                  styles.deltaBadge,
                  { backgroundColor: volumeDelta > 0 ? colors.accentBg : colors.dangerBg },
                ]}>
                  <Text style={[
                    styles.deltaBadgeText,
                    { color: volumeDelta > 0 ? colors.accent : colors.danger },
                  ]}>
                    {volumeDelta > 0 ? '+' : ''}{formatVolume(Math.abs(volumeDelta))}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.chipLabel}>Volume</Text>
          </View>
        </View>

        {/* Détail par exercice */}
        {session.loggedExercises.map((exercise) => {
          const bestSet = exercise.sets.reduce<{ w: number; r: number } | null>((best, s) => {
            if (!s.completed || s.actualWeight == null) return best;
            if (!best || s.actualWeight > best.w) return { w: s.actualWeight, r: s.actualReps ?? 0 };
            return best;
          }, null);

          const exVolume = exercise.sets.reduce(
            (sum, s) => sum + (s.completed ? (s.actualWeight ?? 0) * (s.actualReps ?? 0) : 0),
            0
          );

          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {bestSet && (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestBadgeText}>
                      {bestSet.w} kg × {bestSet.r}
                    </Text>
                  </View>
                )}
              </View>

              {exVolume > 0 && (
                <Text style={styles.exVolume}>
                  {formatVolume(exVolume)} total
                </Text>
              )}

              {exercise.note ? (
                <Text style={styles.note}>📝 {exercise.note}</Text>
              ) : null}

              {/* Header colonnes */}
              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderCell, { flex: 0.5 }]}>N°</Text>
                <Text style={[styles.setHeaderCell, { flex: 1 }]}>POIDS</Text>
                <Text style={[styles.setHeaderCell, { flex: 1 }]}>REPS</Text>
                <Text style={[styles.setHeaderCell, { flex: 1, textAlign: 'right' }]}>VOLUME</Text>
                <Text style={[styles.setHeaderCell, { flex: 0.6, textAlign: 'right' }]}>STATUS</Text>
              </View>

              {exercise.sets.map((set) => {
                const vol =
                  set.completed && set.actualWeight != null && set.actualReps != null
                    ? set.actualWeight * set.actualReps
                    : null;
                return (
                  <View
                    key={set.id}
                    style={[styles.setRow, set.completed && styles.setRowDone]}
                  >
                    <Text style={[styles.setCell, { flex: 0.5, color: colors.textMuted }]}>
                      {set.setNumber}
                    </Text>
                    <Text style={[styles.setCell, { flex: 1 }, set.completed && styles.setCellDone]}>
                      {set.completed && set.actualWeight != null
                        ? `${set.actualWeight} kg`
                        : `${set.targetWeight} kg`}
                    </Text>
                    <Text style={[styles.setCell, { flex: 1 }, set.completed && styles.setCellDone]}>
                      {set.completed && set.actualReps != null ? set.actualReps : set.targetReps}
                    </Text>
                    <Text style={[styles.setCell, { flex: 1, textAlign: 'right' }, set.completed && styles.setCellDone]}>
                      {vol != null ? formatVolume(vol) : '—'}
                    </Text>
                    <View style={{ flex: 0.6, alignItems: 'flex-end' }}>
                      {set.completed ? (
                        <View style={styles.doneChip}>
                          <Text style={styles.doneChipText}>✓</Text>
                        </View>
                      ) : (
                        <View style={styles.skipChip}>
                          <Text style={styles.skipChipText}>—</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },

  header: { gap: 4 },
  sessionName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  programName: { color: colors.textMuted, fontSize: 13 },
  date: { color: colors.textMuted, fontSize: 13, marginTop: 4, textTransform: 'capitalize' },

  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    gap: 4,
  },
  chipAccent: { borderColor: colors.accent + '40' },
  chipVolumeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chipValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
  chipLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  deltaBadge: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  deltaBadgeText: { fontSize: 11, fontWeight: '700' },

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
    justifyContent: 'space-between',
  },
  exerciseName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  bestBadge: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  bestBadgeText: { color: colors.accent, fontSize: 11, fontWeight: '700' },

  exVolume: { color: colors.textMuted, fontSize: 12, marginTop: -4 },
  note: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },

  setHeader: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  setHeaderCell: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: 2,
  },
  setRowDone: { opacity: 1 },
  setCell: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  setCellDone: { color: colors.text },

  doneChip: {
    backgroundColor: colors.accentBg,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  doneChipText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  skipChip: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  skipChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
});
