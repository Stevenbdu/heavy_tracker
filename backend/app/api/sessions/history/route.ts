import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/sessions/history — Toutes les sessions complétées pour les stats
export async function GET() {
  const sessions = await prisma.workoutSession.findMany({
    where: { status: 'completed' },
    orderBy: { date: 'desc' },
    take: 100,
    include: {
      workoutTemplate: { include: { program: true } },
      loggedExercises: {
        include: { sets: { orderBy: { setNumber: 'asc' } } },
      },
    },
  });
  return NextResponse.json(sessions);
}
