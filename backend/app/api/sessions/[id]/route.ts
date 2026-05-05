import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound } from '@/lib/api-handler';

const SESSION_INCLUDE = {
  workoutTemplate: { include: { program: true } },
  loggedExercises: { include: { sets: { orderBy: { setNumber: 'asc' as const } } } },
} as const;

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Session introuvable');
    const session = await prisma.workoutSession.findUnique({ where: { id: numId }, include: SESSION_INCLUDE });
    if (!session) return notFound('Session introuvable');
    return NextResponse.json(session);
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Session introuvable');
    const { status } = await request.json();
    const session = await prisma.workoutSession.update({
      where: { id: numId },
      data: { status },
      include: SESSION_INCLUDE,
    });
    return NextResponse.json(session);
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Session introuvable');
    await prisma.workoutSession.delete({ where: { id: numId } });
    return new NextResponse(null, { status: 204 });
  });
}
