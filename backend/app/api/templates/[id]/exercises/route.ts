import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, targetSets, targetReps, targetWeight, order, maxReps, weightIncrement, progressionType } = body;

  if (!name || targetSets == null || targetReps == null) {
    return NextResponse.json(
      { error: 'name, targetSets et targetReps sont requis' },
      { status: 400 }
    );
  }

  const exercise = await prisma.exerciseTemplate.create({
    data: {
      name,
      targetSets: Number(targetSets),
      targetReps: Number(targetReps),
      targetWeight: Number(targetWeight ?? 0),
      order: Number(order ?? 0),
      workoutTemplateId: Number(id),
      ...(maxReps != null && { maxReps: Number(maxReps) }),
      ...(weightIncrement != null && { weightIncrement: Number(weightIncrement) }),
      ...(progressionType != null && { progressionType }),
    },
  });
  return NextResponse.json(exercise, { status: 201 });
}
