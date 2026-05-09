// Algorithme de progression partagé entre backend et frontend.
// Importé via le path alias `@shared/progression`.

export type ProgressionSet = {
  targetReps: number;
  targetWeight?: number | null;
  actualReps?: number | null;
  actualWeight?: number | null;
};

export type ProgressionResult = {
  targetWeight: number;
  targetReps: number;
  completionRate: number | null;
  workSetsDone: number;
  workSetsExpected: number;
};

export function computeNextProgression(
  sets: ProgressionSet[] | undefined,
  defaultWeight: number,
  defaultReps: number,
  maxReps: number,
  incrementStep: number,
  progressionType: string,
): ProgressionResult {
  const none = (tw = defaultWeight, tr = defaultReps): ProgressionResult =>
    ({ targetWeight: tw, targetReps: tr, completionRate: null, workSetsDone: 0, workSetsExpected: 0 });

  if (!sets || sets.length === 0) return none();

  const validSets = sets.filter((s) => s.actualWeight != null);
  if (validSets.length === 0) return none();

  const lastMaxWeight = Math.max(...validSets.map((s) => s.actualWeight!));

  // Séries réellement effectuées au poids de travail (≥95% du max actuel)
  const actualWorkSets = validSets.filter((s) => s.actualWeight! >= lastMaxWeight * 0.95);

  // Séries attendues au poids de travail (basé sur targetWeight si disponible)
  const setsWithTarget = sets.filter((s) => s.targetWeight != null);
  let expectedWorkSets: ProgressionSet[];
  if (setsWithTarget.length > 0) {
    const maxTargetWeight = Math.max(...setsWithTarget.map((s) => s.targetWeight!));
    expectedWorkSets = sets.filter((s) => (s.targetWeight ?? 0) >= maxTargetWeight * 0.95);
  } else {
    // Fallback si pas de targetWeight : utilise les séries réelles
    expectedWorkSets = actualWorkSets;
  }

  const lastTargetReps = actualWorkSets[0]?.targetReps ?? defaultReps;
  const minActualReps = actualWorkSets.length > 0
    ? Math.min(...actualWorkSets.map((s) => s.actualReps || 0))
    : 0;

  // completionRate = reps réels sur séries travail / reps cibles sur séries attendues
  const totalTargetReps = expectedWorkSets.reduce((t, s) => t + s.targetReps, 0);
  const totalActualReps = actualWorkSets.reduce((t, s) => t + (s.actualReps || 0), 0);
  const completionRate = totalActualReps / (totalTargetReps || 1);

  const result = (tw: number, tr: number): ProgressionResult => ({
    targetWeight: tw,
    targetReps: tr,
    completionRate,
    workSetsDone: actualWorkSets.length,
    workSetsExpected: expectedWorkSets.length,
  });

  if (progressionType === 'MANUAL') {
    return result(lastMaxWeight, lastTargetReps);
  }

  // ── Sous-performance : vérifié EN PREMIER avant toute progression ──
  if (completionRate < 0.6) {
    return result(Math.max(0, lastMaxWeight - 2 * incrementStep), defaultReps);
  }
  if (completionRate < 0.8) {
    return result(Math.max(0, lastMaxWeight - incrementStep), lastTargetReps);
  }

  // ── completionRate ≥ 80% : vérifier la progression ─────────────────
  if (progressionType === 'REPS_ONLY') {
    if (minActualReps >= lastTargetReps) {
      return result(lastMaxWeight, Math.min(minActualReps + 1, maxReps));
    }
    return result(lastMaxWeight, lastTargetReps);
  }

  // DOUBLE_PROGRESSION et FORCE
  // 1. Surperformance : toutes séries au-delà du plafond → bump poids
  if (minActualReps >= maxReps) {
    return result(lastMaxWeight + incrementStep, defaultReps);
  }
  // 2. Surperformance : min(reps) > cible → nouvelle cible = min + 1
  if (minActualReps > lastTargetReps) {
    return result(lastMaxWeight, Math.min(minActualReps + 1, maxReps));
  }
  // 3. Cible atteinte exactement → +1 rep (ou bump poids si déjà au plafond)
  if (minActualReps >= lastTargetReps) {
    if (lastTargetReps >= maxReps) {
      return result(lastMaxWeight + incrementStep, defaultReps);
    }
    return result(lastMaxWeight, lastTargetReps + 1);
  }
  // 4. 80–100% mais reps inférieures à la cible → on retente
  return result(lastMaxWeight, lastTargetReps);
}
