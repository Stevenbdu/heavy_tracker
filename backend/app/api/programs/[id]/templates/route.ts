import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound, badRequest } from '@/lib/api-handler';

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Programme introuvable');
    const templates = await prisma.workoutTemplate.findMany({
      where: { programId: numId },
      orderBy: { order: 'asc' },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json(templates);
  });
}

export function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Programme introuvable');
    const { name, order } = await request.json();
    if (!name?.trim()) return badRequest('Le nom est requis');
    const template = await prisma.workoutTemplate.create({
      data: { name: name.trim(), order: order ?? 0, programId: numId },
      include: { exercises: true },
    });
    return NextResponse.json(template, { status: 201 });
  });
}
