import type { Program, WorkoutSession, ProgressionType } from './api';

export function getProgressionPreset(muscleGroup: string): {
  maxReps: number;
  weightIncrement: number;
  progressionType: ProgressionType;
} {
  if (muscleGroup === 'legs' || muscleGroup === 'chest' || muscleGroup === 'back') {
    return { maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' };
  }
  if (muscleGroup === 'arms' || muscleGroup === 'shoulders') {
    return { maxReps: 15, weightIncrement: 1.25, progressionType: 'REPS_ONLY' };
  }
  return { maxReps: 15, weightIncrement: 0, progressionType: 'MANUAL' };
}

export function countTemplateSets(template: { exercises: { targetSets: number }[] }): number {
  return template.exercises.reduce((sum, ex) => sum + ex.targetSets, 0);
}

export function computeSemaine(program: Program, sessions: WorkoutSession[]): number | null {
  const templateIds = new Set(program.templates.map((t) => t.id));
  const count = sessions.filter(
    (s) => s.status === 'completed' && templateIds.has(s.workoutTemplate.id)
  ).length;
  if (count === 0 || program.templates.length === 0) return null;
  return Math.ceil(count / program.templates.length) + 1;
}
