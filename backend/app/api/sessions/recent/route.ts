import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/sessions/recent — Dernières sessions pour l'écran Home
export async function GET() {
  const sessions = await prisma.workoutSession.findMany({
    orderBy: { date: 'desc' },
    take: 10,
    include: {
      workoutTemplate: { include: { program: true } },
      loggedExercises: {
        include: { sets: { orderBy: { setNumber: 'asc' } } },
      },
    },
  });
  return NextResponse.json(sessions);
}
