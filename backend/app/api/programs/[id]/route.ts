import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const program = await prisma.program.findUnique({
    where: { id: Number(id) },
    include: {
      templates: {
        orderBy: { order: 'asc' },
        include: { exercises: { orderBy: { order: 'asc' } } },
      },
    },
  });

  if (!program) {
    return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
  }
  return NextResponse.json(program);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, description } = body;

  const program = await prisma.program.update({
    where: { id: Number(id) },
    data: { name, description },
  });
  return NextResponse.json(program);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.program.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
