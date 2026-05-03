import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: Number(id) },
    include: { exercises: { orderBy: { order: 'asc' } } },
  });

  if (!template) {
    return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
  }
  return NextResponse.json(template);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, order } = body;

  const template = await prisma.workoutTemplate.update({
    where: { id: Number(id) },
    data: { name, order },
    include: { exercises: { orderBy: { order: 'asc' } } },
  });
  return NextResponse.json(template);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.workoutTemplate.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
