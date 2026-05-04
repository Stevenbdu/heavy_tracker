import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/sessions/:id/exercises — ajouter un exercice libre à une séance en cours
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await request.json();
  const exercise = await prisma.loggedExercise.create({
    data: { name, workoutSessionId: Number(id) },
    include: { sets: { orderBy: { setNumber: 'asc' } } },
  });
  return NextResponse.json(exercise, { status: 201 });
}
