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
    if (!numId) return notFound('Session introuvable');

    const { name } = await request.json();
    if (!name?.trim()) return badRequest('Le nom est requis');

    const exercise = await prisma.loggedExercise.create({
      data: { name: name.trim(), workoutSessionId: numId },
      include: { sets: { orderBy: { setNumber: 'asc' } } },
    });
    return NextResponse.json(exercise, { status: 201 });
  });
}
