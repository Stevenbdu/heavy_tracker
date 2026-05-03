import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const metrics = await prisma.bodyMetric.findMany({
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(metrics);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { weight, height, chest, waist, hips, armR, armL, thighR, thighL } = body;

  const metric = await prisma.bodyMetric.create({
    data: {
      weight:  weight  != null ? parseFloat(weight)  : undefined,
      height:  height  != null ? parseFloat(height)  : undefined,
      chest:   chest   != null ? parseFloat(chest)   : undefined,
      waist:   waist   != null ? parseFloat(waist)   : undefined,
      hips:    hips    != null ? parseFloat(hips)    : undefined,
      armR:    armR    != null ? parseFloat(armR)    : undefined,
      armL:    armL    != null ? parseFloat(armL)    : undefined,
      thighR:  thighR  != null ? parseFloat(thighR)  : undefined,
      thighL:  thighL  != null ? parseFloat(thighL)  : undefined,
    },
  });
  return NextResponse.json(metric, { status: 201 });
}
