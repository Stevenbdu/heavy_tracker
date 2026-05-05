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
    const program = await prisma.program.findUnique({
      where: { id: numId },
      include: {
        templates: {
          orderBy: { order: 'asc' },
          include: { exercises: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!program) return notFound('Programme introuvable');
    return NextResponse.json(program);
  });
}

export function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Programme introuvable');
    const { name, description } = await request.json();
    if (name !== undefined && !name?.trim()) return badRequest('Le nom ne peut pas être vide');
    const program = await prisma.program.update({
      where: { id: numId },
      data: {
        ...(name != null && { name: name.trim() }),
        ...(description !== undefined && { description }),
      },
    });
    return NextResponse.json(program);
  });
}

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Programme introuvable');
    await prisma.program.delete({ where: { id: numId } });
    return new NextResponse(null, { status: 204 });
  });
}
