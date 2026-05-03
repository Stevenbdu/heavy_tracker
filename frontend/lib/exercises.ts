export type MuscleGroup = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bg: string;
};

export type ExerciseDefinition = {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  weight: number;
};

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'chest',     name: 'Poitrine',   emoji: '🔴', color: '#ef4444', bg: '#2a1515' },
  { id: 'back',      name: 'Dos',        emoji: '🔵', color: '#3b82f6', bg: '#0f1f3d' },
  { id: 'legs',      name: 'Jambes',     emoji: '🟠', color: '#f97316', bg: '#2a1a0a' },
  { id: 'shoulders', name: 'Épaules',    emoji: '🟣', color: '#a855f7', bg: '#1e0f2d' },
  { id: 'arms',      name: 'Bras',       emoji: '🟢', color: '#22c55e', bg: '#0d2218' },
  { id: 'core',      name: 'Abdominaux', emoji: '🟡', color: '#eab308', bg: '#1f1a00' },
  { id: 'cardio',    name: 'Cardio',     emoji: '🩷', color: '#ec4899', bg: '#2a0a1a' },
];

export const EXERCISES: ExerciseDefinition[] = [
  // Poitrine
  { name: 'Développé couché',           muscleGroup: 'chest',     sets: 4, reps: 8,   weight: 60  },
  { name: 'Développé incliné',          muscleGroup: 'chest',     sets: 3, reps: 10,  weight: 50  },
  { name: 'Développé décliné',          muscleGroup: 'chest',     sets: 3, reps: 10,  weight: 55  },
  { name: 'Écarté haltères',            muscleGroup: 'chest',     sets: 3, reps: 12,  weight: 16  },
  { name: 'Écarté poulie basse',        muscleGroup: 'chest',     sets: 3, reps: 12,  weight: 20  },
  { name: 'Dips',                       muscleGroup: 'chest',     sets: 3, reps: 10,  weight: 0   },
  { name: 'Pompes',                     muscleGroup: 'chest',     sets: 3, reps: 15,  weight: 0   },
  { name: 'Développé machine',          muscleGroup: 'chest',     sets: 3, reps: 12,  weight: 40  },
  // Dos
  { name: 'Tractions',                  muscleGroup: 'back',      sets: 4, reps: 8,   weight: 0   },
  { name: 'Rowing barre',               muscleGroup: 'back',      sets: 4, reps: 8,   weight: 60  },
  { name: 'Tirage poulie haute',        muscleGroup: 'back',      sets: 3, reps: 10,  weight: 50  },
  { name: 'Rowing câble assis',         muscleGroup: 'back',      sets: 3, reps: 12,  weight: 40  },
  { name: 'Soulevé de terre',           muscleGroup: 'back',      sets: 4, reps: 5,   weight: 80  },
  { name: 'Rowing haltère unilatéral',  muscleGroup: 'back',      sets: 3, reps: 10,  weight: 24  },
  { name: 'Face pull',                  muscleGroup: 'back',      sets: 3, reps: 15,  weight: 20  },
  { name: 'Shrug barre',                muscleGroup: 'back',      sets: 3, reps: 12,  weight: 60  },
  // Jambes
  { name: 'Squat barre',                muscleGroup: 'legs',      sets: 4, reps: 8,   weight: 80  },
  { name: 'Presse à cuisses',           muscleGroup: 'legs',      sets: 4, reps: 10,  weight: 120 },
  { name: 'Fentes marchées',            muscleGroup: 'legs',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Leg curl couché',            muscleGroup: 'legs',      sets: 3, reps: 12,  weight: 30  },
  { name: 'Leg extension',              muscleGroup: 'legs',      sets: 3, reps: 12,  weight: 35  },
  { name: 'Mollets debout',             muscleGroup: 'legs',      sets: 4, reps: 15,  weight: 50  },
  { name: 'Soulevé de terre roumain',   muscleGroup: 'legs',      sets: 3, reps: 10,  weight: 60  },
  { name: 'Hack squat',                 muscleGroup: 'legs',      sets: 3, reps: 10,  weight: 60  },
  // Épaules
  { name: 'Développé militaire',        muscleGroup: 'shoulders', sets: 4, reps: 8,   weight: 40  },
  { name: 'Élévations latérales',       muscleGroup: 'shoulders', sets: 3, reps: 15,  weight: 10  },
  { name: 'Élévations frontales',       muscleGroup: 'shoulders', sets: 3, reps: 12,  weight: 10  },
  { name: 'Arnold press',               muscleGroup: 'shoulders', sets: 3, reps: 10,  weight: 15  },
  { name: 'Écarté arrière poulie',      muscleGroup: 'shoulders', sets: 3, reps: 15,  weight: 10  },
  { name: 'Upright row',                muscleGroup: 'shoulders', sets: 3, reps: 12,  weight: 30  },
  // Bras
  { name: 'Curl biceps barre',          muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Curl haltères alterné',      muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 14  },
  { name: 'Curl marteau',               muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 14  },
  { name: 'Curl pupitre',               muscleGroup: 'arms',      sets: 3, reps: 10,  weight: 15  },
  { name: 'Extension triceps poulie',   muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Skull crusher',              muscleGroup: 'arms',      sets: 3, reps: 10,  weight: 25  },
  { name: 'Développé serré',            muscleGroup: 'arms',      sets: 3, reps: 10,  weight: 40  },
  { name: 'Kickback triceps',           muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 10  },
  // Abdominaux
  { name: 'Crunch',                     muscleGroup: 'core',      sets: 3, reps: 20,  weight: 0   },
  { name: 'Gainage',                    muscleGroup: 'core',      sets: 3, reps: 60,  weight: 0   },
  { name: 'Relevé de jambes',           muscleGroup: 'core',      sets: 3, reps: 15,  weight: 0   },
  { name: 'Russian twist',              muscleGroup: 'core',      sets: 3, reps: 20,  weight: 10  },
  { name: 'Roue abdominale',            muscleGroup: 'core',      sets: 3, reps: 10,  weight: 0   },
  { name: 'Crunch câble',               muscleGroup: 'core',      sets: 3, reps: 15,  weight: 20  },
  // Cardio
  { name: 'Course à pied',              muscleGroup: 'cardio',    sets: 1, reps: 30,  weight: 0   },
  { name: 'Vélo elliptique',            muscleGroup: 'cardio',    sets: 1, reps: 30,  weight: 0   },
  { name: 'Rameur',                     muscleGroup: 'cardio',    sets: 1, reps: 20,  weight: 0   },
  { name: 'Corde à sauter',             muscleGroup: 'cardio',    sets: 3, reps: 100, weight: 0   },
  { name: 'HIIT',                       muscleGroup: 'cardio',    sets: 1, reps: 20,  weight: 0   },
];
