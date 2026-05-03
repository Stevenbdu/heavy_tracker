import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/sessions/:id/exercises/:exerciseId/sets/:setId
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string; setId: string }> }
) {
  const { setId } = await params;
  const body = await request.json();
  const { actualReps, actualWeight, rpe, completed } = body;

  const set = await prisma.loggedSet.update({
    where: { id: Number(setId) },
    data: {
      ...(actualReps != null && { actualReps: Number(actualReps) }),
      ...(actualWeight != null && { actualWeight: Number(actualWeight) }),
      ...(rpe != null && { rpe: Number(rpe) }),
      ...(completed != null && { completed }),
    },
  });
  return NextResponse.json(set);
}

// DELETE /api/sessions/:id/exercises/:exerciseId/sets/:setId
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string; setId: string }> }
) {
  const { setId } = await params;
  await prisma.loggedSet.delete({ where: { id: Number(setId) } });
  return new NextResponse(null, { status: 204 });
}
