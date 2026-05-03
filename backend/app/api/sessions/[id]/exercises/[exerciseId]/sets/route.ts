import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/sessions/:id/exercises/:exerciseId/sets — Ajouter une série
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  const { exerciseId } = await params;
  const body = await request.json();
  const { targetWeight, targetReps, actualWeight, actualReps } = body;

  const exercise = await prisma.loggedExercise.findUnique({
    where: { id: Number(exerciseId) },
    include: { sets: true },
  });

  if (!exercise) {
    return NextResponse.json({ error: 'Exercice introuvable' }, { status: 404 });
  }

  const set = await prisma.loggedSet.create({
    data: {
      setNumber: exercise.sets.length + 1,
      targetReps:   targetReps   ?? 8,
      targetWeight: targetWeight ?? 0,
      actualReps:   actualReps   ?? null,
      actualWeight: actualWeight ?? null,
      completed: actualReps != null && actualWeight != null,
      loggedExerciseId: Number(exerciseId),
    },
  });

  return NextResponse.json(set, { status: 201 });
}
