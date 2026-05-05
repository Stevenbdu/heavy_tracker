import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound } from '@/lib/api-handler';

export function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Exercice introuvable');

    const body = await request.json();
    const { name, targetSets, targetReps, targetWeight, order, maxReps, weightIncrement, progressionType } = body;

    const exercise = await prisma.exerciseTemplate.update({
      where: { id: numId },
      data: {
        ...(name != null && { name }),
        ...(targetSets != null && { targetSets: Number(targetSets) }),
        ...(targetReps != null && { targetReps: Number(targetReps) }),
        ...(targetWeight != null && { targetWeight: Number(targetWeight) }),
        ...(order != null && { order: Number(order) }),
        ...(maxReps != null && { maxReps: Number(maxReps) }),
        ...(weightIncrement != null && { weightIncrement: Number(weightIncrement) }),
        ...(progressionType != null && { progressionType }),
      },
    });
    return NextResponse.json(exercise);
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Exercice introuvable');
    await prisma.exerciseTemplate.delete({ where: { id: numId } });
    return new NextResponse(null, { status: 204 });
  });
}
