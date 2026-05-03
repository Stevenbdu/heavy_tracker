import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Calcule le poids cible pour la prochaine séance
function computeTargetWeight(
  exerciseName: string,
  lastSession: {
    loggedExercises: Array<{
      name: string;
      sets: Array<{ targetReps: number; actualReps: number | null; actualWeight: number | null }>;
    }>;
  } | null,
  defaultWeight: number
): number {
  if (!lastSession) return defaultWeight;

  const lastExercise = lastSession.loggedExercises.find(
    (le) => le.name === exerciseName
  );
  if (!lastExercise || lastExercise.sets.length === 0) return defaultWeight;

  const lastWeight = lastExercise.sets[0].actualWeight ?? defaultWeight;

  const allSetsHitTarget = lastExercise.sets.every(
    (s) => s.actualReps != null && s.actualReps >= s.targetReps
  );

  return allSetsHitTarget ? lastWeight + 2.5 : lastWeight;
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
          const targetWeight = computeTargetWeight(ex.name, lastSession, ex.targetWeight);
          return {
            name: ex.name,
            sets: {
              create: Array.from({ length: ex.targetSets }, (_, i) => ({
                setNumber: i + 1,
                targetReps: ex.targetReps,
                targetWeight,
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
