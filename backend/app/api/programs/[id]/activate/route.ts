import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.$transaction([
    prisma.program.updateMany({ data: { isActive: false } }),
    prisma.program.update({ where: { id: Number(id) }, data: { isActive: true } }),
  ]);
  return new NextResponse(null, { status: 204 });
}
