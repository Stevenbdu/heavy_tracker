import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Calcule le poids cible pour la prochaine séance
type ExerciseHistory = {
  name: string;
  sets: Array<{ targetReps: number; actualReps: number | null; actualWeight: number | null }>;
};

// La fonction renvoie maintenant les DEUX valeurs
function computeNextProgression(
  lastExercise: ExerciseHistory | undefined,
  defaultWeight: number,
  defaultReps: number,
  maxReps: number,           // NOUVEAU
  incrementStep: number,     // NOUVEAU
  progressionType: string    // NOUVEAU ('DOUBLE_PROGRESSION', 'REPS_ONLY', 'MANUAL')
): { targetWeight: number; targetReps: number } {

  // S'il n'y a pas d'historique, on utilise les valeurs du template par défaut
  if (!lastExercise || lastExercise.sets.length === 0) {
    return { targetWeight: defaultWeight, targetReps: defaultReps };
  }

  const validSets = lastExercise.sets.filter(s => s.actualWeight !== null);
  if (validSets.length === 0) {
    return { targetWeight: defaultWeight, targetReps: defaultReps };
  }

  // Poids et Reps de la séance précédente
  const lastMaxWeight = Math.max(...validSets.map(s => s.actualWeight!));
  const lastTargetReps = validSets[0].targetReps; // On part du principe que toutes les séries avaient la même cible

  // Calcul du taux de complétion
  let totalTargetReps = 0;
  let totalActualReps = 0;

  for (const set of validSets) {
    totalTargetReps += set.targetReps;
    totalActualReps += (set.actualReps || 0); // Si c'est null, c'est 0
  }

  const completionRate = totalActualReps / totalTargetReps; // Ex: 22 reps faites / 24 reps cibles = 0.91 (91%)

  // --- LOGIQUE DE PROGRESSION ---

  switch (progressionType) {
    
    case 'DOUBLE_PROGRESSION':
      if (completionRate >= 0.85) {
        if (lastTargetReps >= maxReps) {
          // Plafond atteint : On monte le poids, on redescend les reps à la cible de base
          return { targetWeight: lastMaxWeight + incrementStep, targetReps: defaultReps };
        } else {
          // On continue de monter les reps
          return { targetWeight: lastMaxWeight, targetReps: lastTargetReps + 1 };
        }
      }
      if (completionRate < 0.70) {
        return { targetWeight: Math.round((lastMaxWeight * 0.9) / incrementStep) * incrementStep, targetReps: lastTargetReps };
      }
      return { targetWeight: lastMaxWeight, targetReps: lastTargetReps };

    case 'REPS_ONLY':
      // Pour l'isolation : On ne touche JAMAIS au poids, on cherche juste à atteindre le maxReps
      if (completionRate >= 0.85) {
        if (lastTargetReps >= maxReps) {
          // S'il est au max, il y reste. C'est à l'utilisateur de décider de changer le poids manuellement s'il le veut.
          return { targetWeight: lastMaxWeight, targetReps: maxReps };
        } else {
          // On monte d'une rep
          return { targetWeight: lastMaxWeight, targetReps: lastTargetReps + 1 };
        }
      }
      return { targetWeight: lastMaxWeight, targetReps: lastTargetReps };

    case 'FORCE': {
      // Force pure : progression uniquement quand TOUTES les séries atteignent la rep cible
      // La baisse de poids = -increment (pas -10%) pour rester dans des paliers précis
      const allSetsHit = validSets.every(s => (s.actualReps || 0) >= s.targetReps);
      if (allSetsHit) {
        if (lastTargetReps >= maxReps) {
          return { targetWeight: lastMaxWeight + incrementStep, targetReps: defaultReps };
        } else {
          return { targetWeight: lastMaxWeight, targetReps: lastTargetReps + 1 };
        }
      }
      if (completionRate < 0.70) {
        return { targetWeight: Math.max(0, lastMaxWeight - incrementStep), targetReps: defaultReps };
      }
      return { targetWeight: lastMaxWeight, targetReps: lastTargetReps };
    }

    default:
      return { targetWeight: lastMaxWeight, targetReps: lastTargetReps };
  }
}

// POST /api/sessions — Crée une session depuis un template avec pré-remplissage
export async function POST(request: Request) {
  const body = await request.json();
  const { workoutTemplateId } = body;

  if (!workoutTemplateId) {
    return NextResponse.json({ error: 'workoutTemplateId est requis' }, { status: 400 });
  }

  const template = await prisma.workoutTemplate.findUnique({
    where: { id: Number(workoutTemplateId) },
    include: { exercises: { orderBy: { order: 'asc' } } },
  });

  if (!template) {
    return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
  }

  // Récupère la dernière session complétée pour ce template
  const lastSession = await prisma.workoutSession.findFirst({
    where: { workoutTemplateId: Number(workoutTemplateId), status: 'completed' },
    orderBy: { date: 'desc' },
    include: {
      loggedExercises: {
        include: { sets: true },
      },
    },
  });

  // Crée la session avec tous les exercices et séries pré-remplis
  const session = await prisma.workoutSession.create({
    data: {
      workoutTemplateId: Number(workoutTemplateId),
      status: 'in_progress',
      loggedExercises: {
        create: template.exercises.map((ex) => {

          const lastExercise = lastSession?.loggedExercises.find(
            (le) => le.name === ex.name
          );

          // On récupère le nouvel objectif calculé
          const progression = computeNextProgression(
            lastExercise,
            ex.targetWeight,
            ex.targetReps,
            ex.maxReps,         // ex: 8 pour un Squat, 15 pour des Biceps
            ex.weightIncrement, // ex: 2.5 pour un Squat, 1.25 pour des Biceps
            ex.progressionType  // ex: 'DOUBLE_PROGRESSION' ou 'REPS_ONLY'
          );

          return {
            name: ex.name,
            sets: {
              create: Array.from({ length: ex.targetSets }, (_, i) => ({
                setNumber: i + 1,
                targetReps: progression.targetReps,     // On utilise la valeur de l'algo
                targetWeight: progression.targetWeight, // On utilise la valeur de l'algo
              })),
            },
          };
        }),
      },
    },
    include: {
      loggedExercises: {
        include: { sets: { orderBy: { setNumber: 'asc' } } },
      },
      workoutTemplate: { include: { program: true } },
    },
  });

  return NextResponse.json(session, { status: 201 });
}
