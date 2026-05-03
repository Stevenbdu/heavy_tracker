import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const templates = await prisma.workoutTemplate.findMany({
    where: { programId: Number(id) },
    orderBy: { order: 'asc' },
    include: { exercises: { orderBy: { order: 'asc' } } },
  });
  return NextResponse.json(templates);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, order } = body;

  if (!name) {
    return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
  }

  const template = await prisma.workoutTemplate.create({
    data: { name, order: order ?? 0, programId: Number(id) },
    include: { exercises: true },
  });
  return NextResponse.json(template, { status: 201 });
}
