import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound } from '@/lib/api-handler';

export function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  return apiHandler(async () => {
    const { exerciseId } = await params;
    const numId = parseId(exerciseId);
    if (!numId) return notFound('Exercice introuvable');

    const exercise = await prisma.loggedExercise.findUnique({
      where: { id: numId },
      include: { sets: true },
    });
    if (!exercise) return notFound('Exercice introuvable');

    const { targetWeight, targetReps, actualWeight, actualReps } = await request.json();

    const set = await prisma.loggedSet.create({
      data: {
        setNumber: exercise.sets.length + 1,
        targetReps: targetReps ?? 8,
        targetWeight: targetWeight ?? 0,
        actualReps: actualReps ?? null,
        actualWeight: actualWeight ?? null,
        completed: actualReps != null && actualWeight != null,
        loggedExerciseId: numId,
      },
    });
    return NextResponse.json(set, { status: 201 });
  });
}
