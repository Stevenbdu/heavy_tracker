import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api, WorkoutTemplate } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';
import { infoAlert } from '@/lib/alert';

const PROGRESSION_LABELS: Record<string, string> = {
  DOUBLE_PROGRESSION: 'Force',
  REPS_ONLY: 'Hypertrophie',
  MANUAL: 'Manuel',
};

export default function SessionPreviewScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useFocusEffect(useCallback(() => {
    api.templates.get(Number(templateId))
      .then(setTemplate)
      .catch(() => infoAlert('Erreur', 'Impossible de charger la séance'))
      .finally(() => setLoading(false));
  }, [templateId]));

  const handleStart = async () => {
    setStarting(true);
    try {
      const session = await api.sessions.start(Number(templateId));
      router.replace(`/session/${session.id}`);
    } catch {
      infoAlert('Erreur', 'Impossible de démarrer la séance');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!template) return null;

  const totalSets = template.exercises.reduce((acc, ex) => acc + ex.targetSets, 0);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{template.name}</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Summary chips */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipValue}>{template.exercises.length}</Text>
            <Text style={styles.summaryChipLabel}>exercices</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipValue}>{totalSets}</Text>
            <Text style={styles.summaryChipLabel}>séries</Text>
          </View>
        </View>

        {/* Exercise list */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {template.exercises.map((ex, idx) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.numBadge}>
                  <Text style={styles.numText}>{idx + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {ex.targetSets} × {ex.targetReps} reps
                    {ex.targetWeight > 0 ? ` · ${ex.targetWeight} kg` : ''}
                  </Text>
                </View>
                <View style={[
                  styles.progressionBadge,
                  ex.progressionType === 'DOUBLE_PROGRESSION' && styles.progressionForce,
                  ex.progressionType === 'REPS_ONLY' && styles.progressionHyper,
                ]}>
                  <Text style={[
                    styles.progressionBadgeText,
                    ex.progressionType === 'DOUBLE_PROGRESSION' && styles.progressionForceText,
                    ex.progressionType === 'REPS_ONLY' && styles.progressionHyperText,
                  ]}>
                    {PROGRESSION_LABELS[ex.progressionType] ?? ex.progressionType}
                  </Text>
                </View>
              </View>

              {ex.progressionType !== 'MANUAL' && (
                <View style={styles.progressionDetail}>
                  <Text style={styles.progressionDetailText}>
                    Max {ex.maxReps} reps
                    {ex.progressionType === 'DOUBLE_PROGRESSION' ? ` · +${ex.weightIncrement} kg` : ''}
                  </Text>
                </View>
              )}
            </View>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.startBtn, starting && { opacity: 0.6 }]}
            onPress={handleStart}
            disabled={starting}
            activeOpacity={0.8}
          >
            {starting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={styles.startBtnText}>COMMENCER LA SÉANCE ▶</Text>
            )}
          </TouchableOpacity>
        </View>
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

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryChip: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  summaryChipValue: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  summaryChipLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, gap: spacing.sm },

  exerciseCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
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
  numText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  exerciseMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  progressionBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  progressionForce: { backgroundColor: '#0f2318', borderColor: colors.accent + '50' },
  progressionHyper: { backgroundColor: '#1e0f2d', borderColor: '#a855f750' },
  progressionBadgeText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  progressionForceText: { color: colors.accent },
  progressionHyperText: { color: '#a855f7' },

  progressionDetail: {
    paddingLeft: 32 + spacing.sm,
  },
  progressionDetailText: { color: colors.textMuted, fontSize: 11 },

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
});
