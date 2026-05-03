import { ProgressionType } from '@prisma/client';

import { prisma } from '../lib/prisma';

async function main() {
  console.log('🧹 Nettoyage de la base de données...');
  // Grâce au onDelete: Cascade, supprimer le programme supprime tout !
  await prisma.program.deleteMany(); 

  console.log('🏗️ Création du programme et des 4 séances (6 exos par séance)...');

  // Définition de notre structure de base (Upper, Lower, Push, Pull)
  const programData = [
    {
      name: 'Séance 1 : Upper (Haut du corps)',
      exercises: [
        { name: 'Développé Couché', sets: 4, reps: 6, max: 8, weight: 60, inc: 2.5, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Tirage Vertical (Dos)', sets: 4, reps: 8, max: 10, weight: 50, inc: 5, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Développé Incliné Haltères', sets: 3, reps: 8, max: 10, weight: 22, inc: 2, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Rowing Barre', sets: 3, reps: 8, max: 10, weight: 50, inc: 2.5, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Élévations Latérales', sets: 3, reps: 12, max: 20, weight: 8, inc: 1, type: ProgressionType.REPS_ONLY },
        { name: 'Curl Biceps Barre', sets: 3, reps: 10, max: 15, weight: 25, inc: 2.5, type: ProgressionType.REPS_ONLY },
      ]
    },
    {
      name: 'Séance 2 : Lower (Bas du corps)',
      exercises: [
        { name: 'Squat', sets: 4, reps: 5, max: 8, weight: 80, inc: 2.5, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Soulevé de terre Roumain', sets: 3, reps: 8, max: 10, weight: 70, inc: 5, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Presse à Cuisses', sets: 3, reps: 10, max: 12, weight: 120, inc: 10, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Leg Curl', sets: 3, reps: 12, max: 15, weight: 45, inc: 5, type: ProgressionType.REPS_ONLY },
        { name: 'Extensions Mollets', sets: 4, reps: 15, max: 20, weight: 60, inc: 5, type: ProgressionType.REPS_ONLY },
        { name: 'Crunchs Abdominaux', sets: 3, reps: 15, max: 20, weight: 0, inc: 0, type: ProgressionType.MANUAL },
      ]
    },
    {
      name: 'Séance 3 : Push (Poussée)',
      exercises: [
        { name: 'Développé Militaire', sets: 4, reps: 6, max: 8, weight: 40, inc: 2.5, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Dips', sets: 3, reps: 8, max: 12, weight: 0, inc: 5, type: ProgressionType.DOUBLE_PROGRESSION }, // Poids du corps de base
        { name: 'Écartés Couché', sets: 3, reps: 12, max: 15, weight: 12, inc: 2, type: ProgressionType.REPS_ONLY },
        { name: 'Extension Triceps Poulie', sets: 3, reps: 10, max: 15, weight: 20, inc: 2.5, type: ProgressionType.REPS_ONLY },
        { name: 'Élévations Frontales', sets: 3, reps: 12, max: 15, weight: 10, inc: 1, type: ProgressionType.REPS_ONLY },
        { name: 'Pompes', sets: 3, reps: 15, max: 25, weight: 0, inc: 0, type: ProgressionType.REPS_ONLY },
      ]
    },
    {
      name: 'Séance 4 : Pull (Tirage)',
      exercises: [
        { name: 'Soulevé de Terre', sets: 3, reps: 5, max: 5, weight: 100, inc: 5, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Tractions', sets: 3, reps: 6, max: 10, weight: 0, inc: 2.5, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Tirage Bûcheron', sets: 3, reps: 10, max: 12, weight: 24, inc: 2, type: ProgressionType.DOUBLE_PROGRESSION },
        { name: 'Face Pull', sets: 3, reps: 15, max: 20, weight: 15, inc: 2.5, type: ProgressionType.REPS_ONLY },
        { name: 'Curl Marteau', sets: 3, reps: 10, max: 15, weight: 14, inc: 2, type: ProgressionType.REPS_ONLY },
        { name: 'Shrugs (Trapèzes)', sets: 4, reps: 12, max: 15, weight: 60, inc: 5, type: ProgressionType.REPS_ONLY },
      ]
    }
  ];

  // Création du programme en base
  const program = await prisma.program.create({
    data: {
      name: 'Programme Ultime 4 Jours',
      description: 'Généré par le script de seed pour tester 3 mois de données.',
      templates: {
        create: programData.map((session, index) => ({
          name: session.name,
          order: index + 1,
          exercises: {
            create: session.exercises.map((ex, exIndex) => ({
              name: ex.name,
              order: exIndex + 1,
              targetSets: ex.sets,
              targetReps: ex.reps,
              targetWeight: ex.weight,
              maxReps: ex.max,
              weightIncrement: ex.inc,
              progressionType: ex.type
            }))
          }
        }))
      }
    },
    include: { templates: { include: { exercises: true } } }
  });

  console.log('✅ Programme créé. Génération de 12 semaines (3 mois) d\'historique...');

  const WEEKS = 12;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (WEEKS * 7)); // On recule de 12 semaines

  // Pour chaque semaine (de 0 à 11)
  for (let week = 0; week < WEEKS; week++) {
    
    // Pour chaque séance dans la semaine (4 séances)
    for (let tIndex = 0; tIndex < program.templates.length; tIndex++) {
      const template = program.templates[tIndex];
      
      // On espace les jours : ex Séance 1 le lundi (+0), Séance 2 le mardi (+1), Séance 3 le jeudi (+3)...
      const dayOffset = [0, 1, 3, 4][tIndex]; 
      const sessionDate = new Date(startDate);
      sessionDate.setDate(startDate.getDate() + (week * 7) + dayOffset);

      await prisma.workoutSession.create({
        data: {
          workoutTemplateId: template.id,
          date: sessionDate,
          status: 'completed',
          loggedExercises: {
            create: template.exercises.map((ex) => {
              
              // --- SIMULATION DE L'ALGORITHME DE PROGRESSION ---
              let simReps = ex.targetReps;
              let simWeight = ex.targetWeight;

              if (ex.progressionType === 'DOUBLE_PROGRESSION') {
                const repSteps = ex.maxReps - ex.targetReps + 1; 
                simWeight += Math.floor(week / repSteps) * ex.weightIncrement; // Le poids monte quand on dépasse le plafond
                simReps += (week % repSteps); // Les reps montent chaque semaine
              } 
              else if (ex.progressionType === 'REPS_ONLY') {
                simReps = Math.min(ex.maxReps, ex.targetReps + Math.floor(week / 1.5)); // Monte lentement vers le max
              }

              // On arrondit pour que ça soit propre
              simWeight = Math.round(simWeight * 10) / 10;
              simReps = Math.floor(simReps);

              return {
                name: ex.name,
                sets: {
                  create: Array.from({ length: ex.targetSets }, (_, setIdx) => ({
                    setNumber: setIdx + 1,
                    targetReps: simReps,
                    actualReps: simReps - (setIdx === ex.targetSets - 1 ? Math.floor(Math.random() * 2) : 0), // Laisse parfois une rep de moins à la dernière série (fatigue)
                    targetWeight: simWeight,
                    actualWeight: simWeight,
                    completed: true,
                    rpe: 7 + Math.floor(Math.random() * 3) // RPE aléatoire entre 7 et 9
                  }))
                }
              };
            })
          }
        }
      });
    }
  }

  console.log(`🎉 Succès ! 1 Programme, 4 Templates de Séance, 24 Exercices et ${WEEKS * 4} Séances historiques générées.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });