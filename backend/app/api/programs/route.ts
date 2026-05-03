import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const programs = await prisma.program.findMany({
    include: {
      templates: {
        orderBy: { order: 'asc' },
        include: { exercises: { orderBy: { order: 'asc' } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(programs);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
  }

  const program = await prisma.program.create({
    data: { name, description },
  });
  return NextResponse.json(program, { status: 201 });
}
