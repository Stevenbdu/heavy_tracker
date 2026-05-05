import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound } from '@/lib/api-handler';

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string; setId: string }> }
) {
  return apiHandler(async () => {
    const { setId } = await params;
    const numId = parseId(setId);
    if (!numId) return notFound('Série introuvable');

    const { actualReps, actualWeight, rpe, completed } = await request.json();
    const set = await prisma.loggedSet.update({
      where: { id: numId },
      data: {
        ...(actualReps != null && { actualReps: Number(actualReps) }),
        ...(actualWeight != null && { actualWeight: Number(actualWeight) }),
        ...(rpe != null && { rpe: Number(rpe) }),
        ...(completed != null && { completed }),
      },
    });
    return NextResponse.json(set);
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string; setId: string }> }
) {
  return apiHandler(async () => {
    const { setId } = await params;
    const numId = parseId(setId);
    if (!numId) return notFound('Série introuvable');
    await prisma.loggedSet.delete({ where: { id: numId } });
    return new NextResponse(null, { status: 204 });
  });
}
