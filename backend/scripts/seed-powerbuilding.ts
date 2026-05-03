import 'dotenv/config';
import { ProgressionType } from '@prisma/client';
import { prisma } from '../lib/prisma';

const PROGRAM_NAME = 'Powerbuilding Steven';

async function main() {
  // Supprime uniquement ce programme s'il existe déjà (idempotent)
  await prisma.program.deleteMany({ where: { name: PROGRAM_NAME } });

  await prisma.program.create({
    data: {
      name: PROGRAM_NAME,
      description: 'Upper / Lower / Push / Pull — 4j/sem. Force sur DVC, Tractions, Squat. Focus hypertrophie bras.',
      isActive: true,
      templates: {
        create: [
          // ─────────────────────────────────────────────
          // JOUR 1 — Upper Lourd (Force DVC & Tractions)
          // ─────────────────────────────────────────────
          {
            name: 'Jour 1 — Upper Lourd',
            order: 0,
            exercises: {
              create: [
                {
                  name: 'Développé couché barre',
                  targetSets: 4,
                  targetReps: 3,
                  maxReps: 5,
                  targetWeight: 110,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.FORCE,
                  order: 0,
                },
                {
                  // Poids = lest ajouté (hors poids de corps)
                  name: 'Tractions pronation',
                  targetSets: 4,
                  targetReps: 4,
                  maxReps: 6,
                  targetWeight: 15,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.FORCE,
                  order: 1,
                },
                {
                  name: 'Rowing haltère unilatéral',
                  targetSets: 3,
                  targetReps: 8,
                  maxReps: 10,
                  targetWeight: 40,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.DOUBLE_PROGRESSION,
                  order: 2,
                },
                {
                  name: 'Élévations latérales haltères',
                  targetSets: 4,
                  targetReps: 12,
                  maxReps: 15,
                  targetWeight: 12,
                  weightIncrement: 1.25,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 3,
                },
                {
                  name: 'Curl biceps barre EZ',
                  targetSets: 3,
                  targetReps: 8,
                  maxReps: 10,
                  targetWeight: 30,
                  weightIncrement: 1.25,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 4,
                },
              ],
            },
          },

          // ─────────────────────────────────────────────
          // JOUR 2 — Lower (Jambes)
          // ─────────────────────────────────────────────
          {
            name: 'Jour 2 — Lower',
            order: 1,
            exercises: {
              create: [
                {
                  name: 'Squat barre',
                  targetSets: 4,
                  targetReps: 5,
                  maxReps: 8,
                  targetWeight: 80,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.FORCE,
                  order: 0,
                },
                {
                  name: 'Presse à cuisses',
                  targetSets: 3,
                  targetReps: 10,
                  maxReps: 12,
                  targetWeight: 100,
                  weightIncrement: 5,
                  progressionType: ProgressionType.DOUBLE_PROGRESSION,
                  order: 1,
                },
                {
                  name: 'Soulevé de terre roumain',
                  targetSets: 3,
                  targetReps: 8,
                  maxReps: 10,
                  targetWeight: 70,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.DOUBLE_PROGRESSION,
                  order: 2,
                },
                {
                  name: 'Leg curl couché',
                  targetSets: 3,
                  targetReps: 12,
                  maxReps: 15,
                  targetWeight: 40,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 3,
                },
                {
                  name: 'Mollets debout',
                  targetSets: 4,
                  targetReps: 12,
                  maxReps: 15,
                  targetWeight: 60,
                  weightIncrement: 5,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 4,
                },
              ],
            },
          },

          // ─────────────────────────────────────────────
          // JOUR 3 — Push (Incliné & Triceps)
          // ─────────────────────────────────────────────
          {
            name: 'Jour 3 — Push',
            order: 2,
            exercises: {
              create: [
                {
                  // Poids par haltère
                  name: 'Développé incliné haltères',
                  targetSets: 4,
                  targetReps: 6,
                  maxReps: 8,
                  targetWeight: 46,
                  weightIncrement: 2,
                  progressionType: ProgressionType.FORCE,
                  order: 0,
                },
                {
                  name: 'Développé militaire haltères',
                  targetSets: 3,
                  targetReps: 8,
                  maxReps: 10,
                  targetWeight: 24,
                  weightIncrement: 2,
                  progressionType: ProgressionType.DOUBLE_PROGRESSION,
                  order: 1,
                },
                {
                  name: 'Écarté haltères incliné',
                  targetSets: 3,
                  targetReps: 12,
                  maxReps: 15,
                  targetWeight: 16,
                  weightIncrement: 2,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 2,
                },
                {
                  name: 'Skull crusher barre EZ',
                  targetSets: 3,
                  targetReps: 8,
                  maxReps: 12,
                  targetWeight: 30,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 3,
                },
                {
                  name: 'Extension triceps corde',
                  targetSets: 3,
                  targetReps: 12,
                  maxReps: 15,
                  targetWeight: 20,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 4,
                },
              ],
            },
          },

          // ─────────────────────────────────────────────
          // JOUR 4 — Pull (Dos Volume & Biceps)
          // ─────────────────────────────────────────────
          {
            name: 'Jour 4 — Pull',
            order: 3,
            exercises: {
              create: [
                {
                  name: 'Tirage poulie haute prise large',
                  targetSets: 4,
                  targetReps: 8,
                  maxReps: 12,
                  targetWeight: 60,
                  weightIncrement: 5,
                  progressionType: ProgressionType.DOUBLE_PROGRESSION,
                  order: 0,
                },
                {
                  name: 'Tirage horizontal câble',
                  targetSets: 3,
                  targetReps: 10,
                  maxReps: 12,
                  targetWeight: 55,
                  weightIncrement: 5,
                  progressionType: ProgressionType.DOUBLE_PROGRESSION,
                  order: 1,
                },
                {
                  name: 'Face pull',
                  targetSets: 3,
                  targetReps: 15,
                  maxReps: 15,
                  targetWeight: 20,
                  weightIncrement: 2.5,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 2,
                },
                {
                  name: 'Curl marteau haltères',
                  targetSets: 3,
                  targetReps: 10,
                  maxReps: 12,
                  targetWeight: 20,
                  weightIncrement: 1.25,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 3,
                },
                {
                  name: 'Curl pupitre',
                  targetSets: 3,
                  targetReps: 12,
                  maxReps: 15,
                  targetWeight: 20,
                  weightIncrement: 1.25,
                  progressionType: ProgressionType.REPS_ONLY,
                  order: 4,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Programme "${PROGRAM_NAME}" créé (actif).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
