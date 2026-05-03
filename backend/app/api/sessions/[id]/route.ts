import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await prisma.workoutSession.findUnique({
    where: { id: Number(id) },
    include: {
      workoutTemplate: { include: { program: true } },
      loggedExercises: {
        include: { sets: { orderBy: { setNumber: 'asc' } } },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }
  return NextResponse.json(session);
}

// PATCH /api/sessions/:id — Mettre à jour le statut (compléter la session)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  const session = await prisma.workoutSession.update({
    where: { id: Number(id) },
    data: { status },
    include: {
      workoutTemplate: { include: { program: true } },
      loggedExercises: {
        include: { sets: { orderBy: { setNumber: 'asc' } } },
      },
    },
  });
  return NextResponse.json(session);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.workoutSession.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
