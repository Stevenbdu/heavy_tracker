import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  await prisma.loggedSet.deleteMany();
  await prisma.loggedExercise.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.bodyMetric.deleteMany();

  const autres = await prisma.program.findMany({
    where: { name: { not: 'Programme Ultime 4 Jours' } },
  });

  for (const p of autres) {
    await prisma.program.delete({ where: { id: p.id } });
  }

  console.log('Nettoyage terminé.');
}

main().finally(() => pool.end());
