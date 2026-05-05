import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api-handler';

export function GET() {
  return apiHandler(async () => {
    const sessions = await prisma.workoutSession.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        workoutTemplate: { include: { program: true } },
        loggedExercises: { include: { sets: { orderBy: { setNumber: 'asc' } } } },
      },
    });
    return NextResponse.json(sessions);
  });
}
