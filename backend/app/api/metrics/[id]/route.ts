import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, parseId, notFound } from '@/lib/api-handler';

export function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (!numId) return notFound('Métrique introuvable');
    await prisma.bodyMetric.delete({ where: { id: numId } });
    return new NextResponse(null, { status: 204 });
  });
}
