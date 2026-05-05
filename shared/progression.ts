// Algorithme de progression partagé entre backend et frontend.
// Importé via le path alias `@shared/progression`.

export type ProgressionSet = {
  targetReps: number;
  actualReps?: number | null;
  actualWeight?: number | null;
};

export type ProgressionResult = {
  targetWeight: number;
  targetReps: number;
  completionRate: number | null;
};

export function computeNextProgression(
  sets: ProgressionSet[] | undefined,
  defaultWeight: number,
  defaultReps: number,
  maxReps: number,
  incrementStep: number,
  progressionType: string,
): ProgressionResult {
  if (!sets || sets.length === 0) {
    return { targetWeight: defaultWeight, targetReps: defaultReps, completionRate: null };
  }

  const validSets = sets.filter((s) => s.actualWeight != null);
  if (validSets.length === 0) {
    return { targetWeight: defaultWeight, targetReps: defaultReps, completionRate: null };
  }

  const lastMaxWeight = Math.max(...validSets.map((s) => s.actualWeight!));

  // Séries de travail = ≥95% du poids max (exclut warmup/backoff)
  const workSets = validSets.filter((s) => s.actualWeight! >= lastMaxWeight * 0.95);
  const lastTargetReps = workSets[0].targetReps;

  const totalTarget = workSets.reduce((t, s) => t + s.targetReps, 0);
  const totalActual = workSets.reduce((t, s) => t + (s.actualReps || 0), 0);
  const completionRate = totalActual / (totalTarget || 1);
  const minActualReps = Math.min(...workSets.map((s) => s.actualReps || 0));

  if (progressionType === 'MANUAL') {
    return { targetWeight: lastMaxWeight, targetReps: lastTargetReps, completionRate };
  }

  if (progressionType === 'REPS_ONLY') {
    if (minActualReps > lastTargetReps) {
      return {
        targetWeight: lastMaxWeight,
        targetReps: Math.min(minActualReps + 1, maxReps),
        completionRate,
      };
    }
    if (minActualReps >= lastTargetReps) {
      return {
        targetWeight: lastMaxWeight,
        targetReps: Math.min(lastTargetReps + 1, maxReps),
        completionRate,
      };
    }
    return { targetWeight: lastMaxWeight, targetReps: lastTargetReps, completionRate };
  }

  // DOUBLE_PROGRESSION et FORCE
  // 1. Surperformance : min(reps) ≥ maxReps → bump poids, reset reps
  if (minActualReps >= maxReps) {
    return { targetWeight: lastMaxWeight + incrementStep, targetReps: defaultReps, completionRate };
  }
  // 2. Surperformance : min(reps) > cible → nouvelle cible = min + 1
  if (minActualReps > lastTargetReps) {
    return {
      targetWeight: lastMaxWeight,
      targetReps: Math.min(minActualReps + 1, maxReps),
      completionRate,
    };
  }
  // 3. Toutes séries au target : +1 rep, ou bump poids si déjà au plafond
  if (minActualReps >= lastTargetReps) {
    if (lastTargetReps >= maxReps) {
      return { targetWeight: lastMaxWeight + incrementStep, targetReps: defaultReps, completionRate };
    }
    return { targetWeight: lastMaxWeight, targetReps: lastTargetReps + 1, completionRate };
  }
  // 4. Sous-performance par paliers
  if (completionRate < 0.6) {
    return {
      targetWeight: Math.max(0, lastMaxWeight - 2 * incrementStep),
      targetReps: defaultReps,
      completionRate,
    };
  }
  if (completionRate < 0.8) {
    return {
      targetWeight: Math.max(0, lastMaxWeight - incrementStep),
      targetReps: lastTargetReps,
      completionRate,
    };
  }
  // 80–100% : on retente la même cible
  return { targetWeight: lastMaxWeight, targetReps: lastTargetReps, completionRate };
}
