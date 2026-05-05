import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, badRequest, parsePositiveFloat } from '@/lib/api-handler';

export function GET() {
  return apiHandler(async () => {
    const metrics = await prisma.bodyMetric.findMany({ orderBy: { date: 'desc' } });
    return NextResponse.json(metrics);
  });
}

export function POST(request: Request) {
  return apiHandler(async () => {
    const body = await request.json();
    const fields = ['weight', 'height', 'chest', 'waist', 'hips', 'armR', 'armL', 'thighR', 'thighL'] as const;

    const data: Partial<Record<typeof fields[number], number>> = {};
    for (const field of fields) {
      const raw = body[field];
      if (raw == null) continue;
      const value = parsePositiveFloat(raw);
      if (value === null) return badRequest(`Valeur invalide pour "${field}"`);
      data[field] = value;
    }

    if (Object.keys(data).length === 0) {
      return badRequest('Au moins une mesure est requise');
    }

    const metric = await prisma.bodyMetric.create({ data });
    return NextResponse.json(metric, { status: 201 });
  });
}
