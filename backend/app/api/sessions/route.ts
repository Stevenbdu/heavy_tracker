import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeNextProgression } from '@shared/progression';
import { apiHandler, badRequest, notFound } from '@/lib/api-handler';

export function POST(request: Request) {
  return apiHandler(async () => {
    const { workoutTemplateId } = await request.json();
    if (!workoutTemplateId) return badRequest('workoutTemplateId est requis');

    const template = await prisma.workoutTemplate.findUnique({
      where: { id: Number(workoutTemplateId) },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    if (!template) return notFound('Séance introuvable');

    const lastSession = await prisma.workoutSession.findFirst({
      where: { workoutTemplateId: Number(workoutTemplateId), status: 'completed' },
      orderBy: { date: 'desc' },
      include: { loggedExercises: { include: { sets: true } } },
    });

    const session = await prisma.workoutSession.create({
      data: {
        workoutTemplateId: Number(workoutTemplateId),
        status: 'in_progress',
        loggedExercises: {
          create: template.exercises.map((ex) => {
            const lastExercise = lastSession?.loggedExercises.find((le) => le.name === ex.name);
            const progression = computeNextProgression(
              lastExercise?.sets,
              ex.targetWeight,
              ex.targetReps,
              ex.maxReps,
              ex.weightIncrement,
              ex.progressionType
            );
            return {
              name: ex.name,
              sets: {
                create: Array.from({ length: ex.targetSets }, (_, i) => ({
                  setNumber: i + 1,
                  targetReps: progression.targetReps,
                  targetWeight: progression.targetWeight,
                })),
              },
            };
          }),
        },
      },
      include: {
        loggedExercises: { include: { sets: { orderBy: { setNumber: 'asc' } } } },
        workoutTemplate: { include: { program: true } },
      },
    });

    return NextResponse.json(session, { status: 201 });
  });
}
