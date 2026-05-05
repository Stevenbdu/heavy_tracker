import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound } from '@/lib/api-handler';

export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Séance introuvable');
    const template = await prisma.workoutTemplate.findUnique({
      where: { id: numId },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    if (!template) return notFound('Séance introuvable');
    return NextResponse.json(template);
  });
}

export function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Séance introuvable');
    const { name, order } = await request.json();
    const template = await prisma.workoutTemplate.update({
      where: { id: numId },
      data: {
        ...(name != null && { name }),
        ...(order != null && { order }),
      },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json(template);
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Séance introuvable');
    await prisma.workoutTemplate.delete({ where: { id: numId } });
    return new NextResponse(null, { status: 204 });
  });
}
