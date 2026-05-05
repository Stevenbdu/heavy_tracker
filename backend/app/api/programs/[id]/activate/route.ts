import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound } from '@/lib/api-handler';

export function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Programme introuvable');
    await prisma.$transaction([
      prisma.program.updateMany({ data: { isActive: false } }),
      prisma.program.update({ where: { id: numId }, data: { isActive: true } }),
    ]);
    return new NextResponse(null, { status: 204 });
  });
}
