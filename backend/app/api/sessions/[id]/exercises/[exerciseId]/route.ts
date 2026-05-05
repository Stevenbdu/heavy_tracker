import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound } from '@/lib/api-handler';

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  return apiHandler(async () => {
    const { exerciseId } = await params;
    const numId = parseId(exerciseId);
    if (!numId) return notFound('Exercice introuvable');
    await prisma.loggedExercise.delete({ where: { id: numId } });
    return new NextResponse(null, { status: 204 });
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  return apiHandler(async () => {
    const { exerciseId } = await params;
    const numId = parseId(exerciseId);
    if (!numId) return notFound('Exercice introuvable');
    const { note } = await request.json();
    const exercise = await prisma.loggedExercise.update({
      where: { id: numId },
      data: { note },
      include: { sets: { orderBy: { setNumber: 'asc' } } },
    });
    return NextResponse.json(exercise);
  });
}
