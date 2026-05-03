import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Program, WorkoutSession } from '@/lib/api';
import { colors, radius, spacing, programAccents } from '@/lib/theme';
import { infoAlert } from '@/lib/alert';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'Bonne nuit 😴';
  if (h < 12) return 'Bonjour 👋';
  if (h < 18) return 'Bonne après-midi 👋';
  return 'Bonsoir 👋';
}

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun, 1=Mon...
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate()
    && a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear();
}

function computeStreak(sessions: WorkoutSession[]) {
  const completed = sessions
    .filter((s) => s.status === 'completed')
    .map((s) => new Date(s.date))
    .sort((a, b) => b.getTime() - a.getTime());

  if (completed.length === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const hasSession = completed.some((d) => isSameDay(d, cursor));
    if (hasSession) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      // today has no session — check yesterday
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function HomeScreen() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [progs, sessions] = await Promise.all([
        api.programs.list(),
        api.sessions.recent(),
      ]);
      setPrograms(progs);
      setRecentSessions(sessions);
    } catch {
      infoAlert('Erreur', 'Impossible de joindre le serveur');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleStart = async (templateId: number) => {
    setStarting(templateId);
    try {
      const session = await api.sessions.start(templateId);
      router.push(`/session/${session.id}?fresh=1`);
    } catch {
      infoAlert('Erreur', 'Impossible de démarrer la séance');
    } finally {
      setStarting(null);
    }
  };

  const inProgressSession = recentSessions.find((s) => s.status === 'in_progress');
  const completedSessions = recentSessions.filter((s) => s.status === 'completed');
  const streak = computeStreak(recentSessions);
  const weekDays = getWeekDays();
  const sessionDates = recentSessions.map((s) => new Date(s.date));
  const today = new Date();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.greetingSub}>
              {programs.length > 0
                ? `${programs.length} programme${programs.length > 1 ? 's' : ''} actif${programs.length > 1 ? 's' : ''}`
                : 'Crée ton premier programme'}
            </Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakCount}>{streak}</Text>
            </View>
          )}
        </View>

        {/* Calendrier hebdo */}
        <View style={styles.weekStrip}>
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const hasSession = sessionDates.some((d) => isSameDay(d, day));
            return (
              <View key={i} style={styles.weekDay}>
                <Text style={[styles.weekDayLetter, isToday && styles.weekDayLetterActive]}>
                  {DAY_LETTERS[i]}
                </Text>
                <View style={[styles.weekDayCircle, isToday && styles.weekDayCircleActive]}>
                  <Text style={[styles.weekDayNum, isToday && styles.weekDayNumActive]}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={[styles.weekDayDot, hasSession && styles.weekDayDotActive]} />
              </View>
            );
          })}
        </View>

        {/* Séance en cours */}
        {inProgressSession && (
          <TouchableOpacity
            style={styles.inProgressCard}
            onPress={() => router.push(`/session/${inProgressSession.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.inProgressPulse} />
            <View style={{ flex: 1 }}>
              <Text style={styles.inProgressLabel}>⚡ SÉANCE EN COURS</Text>
              <Text style={styles.inProgressTitle}>{inProgressSession.workoutTemplate.name}</Text>
              <Text style={styles.inProgressSub}>
                {inProgressSession.workoutTemplate.program.name}
              </Text>
            </View>
            <Text style={styles.inProgressArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Programmes */}
        {programs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyTitle}>Aucun programme</Text>
            <Text style={styles.emptySub}>Crée ton premier programme dans l'onglet Programmes</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/programs')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Créer un programme</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>MES PROGRAMMES</Text>
            {programs.map((program, idx) => {
              const accentColor = programAccents[idx % programAccents.length];
              return (
                <View key={program.id} style={styles.programBlock}>
                  <View style={styles.programTitleRow}>
                    <View style={[styles.programDot, { backgroundColor: accentColor }]} />
                    <Text style={styles.programName}>{program.name}</Text>
                  </View>
                  {program.description && (
                    <Text style={styles.programDesc}>{program.description}</Text>
                  )}
                  {program.templates.length === 0 ? (
                    <Text style={styles.noTemplates}>Aucune séance configurée</Text>
                  ) : (
                    program.templates.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.templateCard,
                          { borderLeftColor: accentColor },
                          starting === template.id && { opacity: 0.6 },
                        ]}
                        onPress={() => handleStart(template.id)}
                        disabled={starting !== null}
                        activeOpacity={0.85}
                      >
                        <View style={styles.templateInfo}>
                          <Text style={styles.templateName}>{template.name}</Text>
                          <Text style={styles.templateMeta}>
                            {template.exercises.length} exercice{template.exercises.length !== 1 ? 's' : ''}
                            {template.exercises.length > 0 && (
                              <Text style={styles.templateExercises}>
                                {' '}· {template.exercises.slice(0, 3).map((e) => e.name).join(', ')}
                                {template.exercises.length > 3 ? '…' : ''}
                              </Text>
                            )}
                          </Text>
                        </View>
                        {starting === template.id ? (
                          <ActivityIndicator color={accentColor} />
                        ) : (
                          <View style={[styles.startBtn, {
                            backgroundColor: accentColor + '22',
                            borderColor: accentColor + '55',
                          }]}>
                            <Text style={[styles.startBtnText, { color: accentColor }]}>▶</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Dernières séances */}
        {completedSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DERNIÈRES SÉANCES</Text>
            {completedSessions.slice(0, 5).map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.historyItem}
                onPress={() => router.push(`/history/${session.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.historyDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{session.workoutTemplate.name}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(session.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Text>
                </View>
                <Text style={styles.historyChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  greeting: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  greetingSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  streakBadge: {
    backgroundColor: '#1a1200',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d2e00',
    minWidth: 60,
  },
  streakFire: { fontSize: 18 },
  streakCount: { color: '#f59e0b', fontSize: 16, fontWeight: '800' },

  weekStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDayLetter: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  weekDayLetterActive: { color: colors.accent },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCircleActive: { backgroundColor: colors.accent },
  weekDayNum: { color: colors.text, fontSize: 13, fontWeight: '600' },
  weekDayNumActive: { color: colors.accentText, fontWeight: '800' },
  weekDayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  weekDayDotActive: { backgroundColor: colors.accent },

  inProgressCard: {
    backgroundColor: '#0f1f10',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inProgressPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  inProgressLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  inProgressTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  inProgressSub: { color: colors.accent, fontSize: 12, marginTop: 2, opacity: 0.8 },
  inProgressArrow: { color: colors.accent, fontSize: 24, fontWeight: '300' },

  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  programBlock: { gap: spacing.xs },
  programTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  programDot: { width: 8, height: 8, borderRadius: 4 },
  programName: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  programDesc: { color: colors.textMuted, fontSize: 13, marginLeft: spacing.md + spacing.xs },
  noTemplates: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginLeft: spacing.md + spacing.xs },

  templateCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  templateInfo: { flex: 1 },
  templateName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  templateMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  templateExercises: { color: colors.textMuted, opacity: 0.7 },
  startBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtnText: { fontSize: 14, fontWeight: '800' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptyButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  emptyButtonText: { color: colors.accentText, fontSize: 14, fontWeight: '700' },

  section: { gap: spacing.sm },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  historyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  historyName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  historyDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  historyChevron: { color: colors.textMuted, fontSize: 22, fontWeight: '300' },
});
