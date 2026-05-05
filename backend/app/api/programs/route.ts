import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, badRequest } from '@/lib/api-handler';

export function GET() {
  return apiHandler(async () => {
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
  });
}

export function POST(request: Request) {
  return apiHandler(async () => {
    const body = await request.json();
    const { name, description } = body;
    if (!name?.trim()) return badRequest('Le nom est requis');
    const program = await prisma.program.create({ data: { name: name.trim(), description } });
    return NextResponse.json(program, { status: 201 });
  });
}
