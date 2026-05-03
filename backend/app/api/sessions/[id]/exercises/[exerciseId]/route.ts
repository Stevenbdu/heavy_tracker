import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/sessions/:id/exercises/:exerciseId
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  const { exerciseId } = await params;
  await prisma.loggedExercise.delete({ where: { id: Number(exerciseId) } });
  return new NextResponse(null, { status: 204 });
}

// PATCH /api/sessions/:id/exercises/:exerciseId — modifier la note
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  const { exerciseId } = await params;
  const { note } = await request.json();
  const exercise = await prisma.loggedExercise.update({
    where: { id: Number(exerciseId) },
    data: { note },
    include: { sets: { orderBy: { setNumber: 'asc' } } },
  });
  return NextResponse.json(exercise);
}
