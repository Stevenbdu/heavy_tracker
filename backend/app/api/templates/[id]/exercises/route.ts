import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound, badRequest } from '@/lib/api-handler';

export function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Séance introuvable');

    const body = await request.json();
    const { name, targetSets, targetReps, targetWeight, order, maxReps, weightIncrement, progressionType } = body;

    if (!name?.trim()) return badRequest('Le nom est requis');
    if (targetSets == null || targetReps == null) return badRequest('targetSets et targetReps sont requis');

    const setsNum = Number(targetSets);
    const repsNum = Number(targetReps);
    if (!Number.isInteger(setsNum) || setsNum < 1) return badRequest('targetSets invalide');
    if (!Number.isInteger(repsNum) || repsNum < 1) return badRequest('targetReps invalide');

    const exercise = await prisma.exerciseTemplate.create({
      data: {
        name: name.trim(),
        targetSets: setsNum,
        targetReps: repsNum,
        targetWeight: targetWeight != null ? Number(targetWeight) : 0,
        order: order != null ? Number(order) : 0,
        workoutTemplateId: numId,
        ...(maxReps != null && { maxReps: Number(maxReps) }),
        ...(weightIncrement != null && { weightIncrement: Number(weightIncrement) }),
        ...(progressionType != null && { progressionType }),
      },
    });
    return NextResponse.json(exercise, { status: 201 });
  });
}
