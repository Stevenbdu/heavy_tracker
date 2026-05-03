/**
 * Wipe tout sauf le programme "Powerbuilding Steven" et ses données.
 * Supprime : tous les autres programmes + leurs templates/exercices/sessions (cascade),
 *             toutes les sessions orphelines, les métriques corporelles.
 * Conserve : "Powerbuilding Steven" et tout son historique de séances.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

const KEEP_PROGRAM = 'Powerbuilding Steven';

async function main() {
  const kept = await prisma.program.findFirst({ where: { name: KEEP_PROGRAM } });

  if (!kept) {
    console.error(`❌ Programme "${KEEP_PROGRAM}" introuvable. Lance d'abord seed:powerbuilding.`);
    process.exit(1);
  }

  // Supprime tous les autres programmes (cascade → templates → exercices → sessions → sets)
  const deleted = await prisma.program.deleteMany({
    where: { id: { not: kept.id } },
  });

  // Supprime aussi les métriques corporelles
  const metrics = await prisma.bodyMetric.deleteMany();

  console.log(`✅ Wipe terminé.`);
  console.log(`   • ${deleted.count} programme(s) supprimé(s)`);
  console.log(`   • ${metrics.count} métrique(s) corporelle(s) supprimée(s)`);
  console.log(`   • "${KEEP_PROGRAM}" conservé (id: ${kept.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
