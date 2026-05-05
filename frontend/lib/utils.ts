import type { WorkoutSession } from './api';

// ── Fitness ───────────────────────────────────────────────────────

export function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function sessionVolume(session: WorkoutSession): number {
  return session.loggedExercises.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce(
        (sum, set) => sum + (set.completed ? (set.actualWeight ?? 0) * (set.actualReps ?? 0) : 0),
        0
      ),
    0
  );
}

export function computeStreak(sessions: WorkoutSession[]): number {
  const completed = sessions
    .filter((s) => s.status === 'completed')
    .map((s) => new Date(s.date))
    .sort((a, b) => b.getTime() - a.getTime());

  if (completed.length === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const hasSession = completed.some((d) => isSameDay(d, cursor));
    if (hasSession) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── Dates ─────────────────────────────────────────────────────────

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
): string {
  return new Date(iso).toLocaleDateString('fr-FR', options);
}

export function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  return `il y a ${diff}j`;
}

// ── Formatters ────────────────────────────────────────────────────

export function formatVolume(vol: number): string {
  return vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)} kg`;
}
