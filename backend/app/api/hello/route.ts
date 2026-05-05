import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api-handler';

export function GET() {
  return apiHandler(async () => {
    const count = await prisma.program.count();
    return NextResponse.json({
      status: 'success',
      message: `Connexion DB réussie ! Il y a actuellement ${count} programme(s) enregistré(s).`,
    });
  });
}
