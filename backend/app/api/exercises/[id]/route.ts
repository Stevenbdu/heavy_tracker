import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, targetSets, targetReps, targetWeight, order, maxReps, weightIncrement, progressionType } = body;

  const exercise = await prisma.exerciseTemplate.update({
    where: { id: Number(id) },
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
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.exerciseTemplate.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
