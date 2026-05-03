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
  imageUrl?: string;
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
  // ── Poitrine ──────────────────────────────────────────────────────
  { name: 'Développé couché barre',          muscleGroup: 'chest',     sets: 4, reps: 8,   weight: 60  },
  { name: 'Développé couché haltères',       muscleGroup: 'chest',     sets: 4, reps: 8,   weight: 28  },
  { name: 'Développé incliné barre',         muscleGroup: 'chest',     sets: 3, reps: 10,  weight: 50  },
  { name: 'Développé incliné haltères',      muscleGroup: 'chest',     sets: 3, reps: 10,  weight: 24  },
  { name: 'Développé décliné barre',         muscleGroup: 'chest',     sets: 3, reps: 10,  weight: 55  },
  { name: 'Développé décliné haltères',      muscleGroup: 'chest',     sets: 3, reps: 10,  weight: 24  },
  { name: 'Écarté haltères plat',            muscleGroup: 'chest',     sets: 3, reps: 12,  weight: 16  },
  { name: 'Écarté haltères incliné',         muscleGroup: 'chest',     sets: 3, reps: 12,  weight: 14  },
  { name: 'Écarté poulie basse',             muscleGroup: 'chest',     sets: 3, reps: 12,  weight: 20  },
  { name: 'Pull-over haltère',               muscleGroup: 'chest',     sets: 3, reps: 12,  weight: 20  },
  { name: 'Dips',                            muscleGroup: 'chest',     sets: 3, reps: 10,  weight: 0   },
  { name: 'Pompes',                          muscleGroup: 'chest',     sets: 3, reps: 15,  weight: 0   },
  { name: 'Développé machine',               muscleGroup: 'chest',     sets: 3, reps: 12,  weight: 40  },

  // ── Dos ───────────────────────────────────────────────────────────
  { name: 'Tractions pronation',             muscleGroup: 'back',      sets: 4, reps: 8,   weight: 0   },
  { name: 'Tractions supination',            muscleGroup: 'back',      sets: 3, reps: 8,   weight: 0   },
  { name: 'Rowing barre',                    muscleGroup: 'back',      sets: 4, reps: 8,   weight: 60  },
  { name: 'Rowing haltère unilatéral',       muscleGroup: 'back',      sets: 3, reps: 10,  weight: 24  },
  { name: 'Rowing câble assis',              muscleGroup: 'back',      sets: 3, reps: 12,  weight: 40  },
  { name: 'Tirage poulie haute prise large', muscleGroup: 'back',      sets: 3, reps: 10,  weight: 50  },
  { name: 'Tirage poulie haute prise serrée',muscleGroup: 'back',      sets: 3, reps: 10,  weight: 45  },
  { name: 'Tirage horizontal câble',         muscleGroup: 'back',      sets: 3, reps: 12,  weight: 40  },
  { name: 'Soulevé de terre',                muscleGroup: 'back',      sets: 4, reps: 5,   weight: 80  },
  { name: 'Soulevé de terre sumo',           muscleGroup: 'back',      sets: 4, reps: 5,   weight: 80  },
  { name: 'Face pull',                       muscleGroup: 'back',      sets: 3, reps: 15,  weight: 20  },
  { name: 'Shrug barre',                     muscleGroup: 'back',      sets: 3, reps: 12,  weight: 60  },
  { name: 'Shrug haltères',                  muscleGroup: 'back',      sets: 3, reps: 12,  weight: 24  },

  // ── Jambes ────────────────────────────────────────────────────────
  { name: 'Squat barre',                     muscleGroup: 'legs',      sets: 4, reps: 8,   weight: 80  },
  { name: 'Squat haltères (goblet)',          muscleGroup: 'legs',      sets: 3, reps: 12,  weight: 24  },
  { name: 'Hack squat machine',              muscleGroup: 'legs',      sets: 3, reps: 10,  weight: 60  },
  { name: 'Presse à cuisses',                muscleGroup: 'legs',      sets: 4, reps: 10,  weight: 120 },
  { name: 'Fentes marchées haltères',        muscleGroup: 'legs',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Fentes statiques barre',          muscleGroup: 'legs',      sets: 3, reps: 10,  weight: 40  },
  { name: 'Fentes bulgares haltères',        muscleGroup: 'legs',      sets: 3, reps: 10,  weight: 20  },
  { name: 'Leg curl couché',                 muscleGroup: 'legs',      sets: 3, reps: 12,  weight: 30  },
  { name: 'Leg curl assis',                  muscleGroup: 'legs',      sets: 3, reps: 12,  weight: 30  },
  { name: 'Leg extension',                   muscleGroup: 'legs',      sets: 3, reps: 12,  weight: 35  },
  { name: 'Mollets debout',                  muscleGroup: 'legs',      sets: 4, reps: 15,  weight: 50  },
  { name: 'Mollets assis',                   muscleGroup: 'legs',      sets: 4, reps: 15,  weight: 30  },
  { name: 'Soulevé de terre roumain',        muscleGroup: 'legs',      sets: 3, reps: 10,  weight: 60  },
  { name: 'Hip thrust barre',                muscleGroup: 'legs',      sets: 4, reps: 10,  weight: 60  },

  // ── Épaules ───────────────────────────────────────────────────────
  { name: 'Développé militaire barre',       muscleGroup: 'shoulders', sets: 4, reps: 8,   weight: 40  },
  { name: 'Développé militaire haltères',    muscleGroup: 'shoulders', sets: 3, reps: 10,  weight: 18  },
  { name: 'Élévations latérales haltères',   muscleGroup: 'shoulders', sets: 3, reps: 15,  weight: 10  },
  { name: 'Élévations latérales câble',      muscleGroup: 'shoulders', sets: 3, reps: 15,  weight: 10  },
  { name: 'Élévations frontales haltères',   muscleGroup: 'shoulders', sets: 3, reps: 12,  weight: 10  },
  { name: 'Arnold press',                    muscleGroup: 'shoulders', sets: 3, reps: 10,  weight: 16  },
  { name: 'Oiseau haltères (rear delt)',     muscleGroup: 'shoulders', sets: 3, reps: 15,  weight: 8   },
  { name: 'Écarté arrière poulie',           muscleGroup: 'shoulders', sets: 3, reps: 15,  weight: 10  },
  { name: 'Upright row barre',               muscleGroup: 'shoulders', sets: 3, reps: 12,  weight: 30  },

  // ── Bras ──────────────────────────────────────────────────────────
  { name: 'Curl biceps barre',               muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Curl biceps barre EZ',            muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Curl haltères alterné',           muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 14  },
  { name: 'Curl marteau haltères',           muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 14  },
  { name: 'Curl pupitre',                    muscleGroup: 'arms',      sets: 3, reps: 10,  weight: 15  },
  { name: 'Curl câble',                      muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Curl concentré',                  muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 12  },
  { name: 'Extension triceps poulie',        muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Extension triceps corde',         muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 20  },
  { name: 'Skull crusher barre EZ',          muscleGroup: 'arms',      sets: 3, reps: 10,  weight: 25  },
  { name: 'Développé serré barre',           muscleGroup: 'arms',      sets: 3, reps: 10,  weight: 40  },
  { name: 'Kickback triceps haltère',        muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 10  },
  { name: 'Dips triceps banc',               muscleGroup: 'arms',      sets: 3, reps: 12,  weight: 0   },

  // ── Abdominaux ────────────────────────────────────────────────────
  { name: 'Crunch',                          muscleGroup: 'core',      sets: 3, reps: 20,  weight: 0   },
  { name: 'Crunch câble',                    muscleGroup: 'core',      sets: 3, reps: 15,  weight: 20  },
  { name: 'Gainage frontal',                 muscleGroup: 'core',      sets: 3, reps: 60,  weight: 0   },
  { name: 'Gainage latéral',                 muscleGroup: 'core',      sets: 3, reps: 45,  weight: 0   },
  { name: 'Relevé de jambes',                muscleGroup: 'core',      sets: 3, reps: 15,  weight: 0   },
  { name: 'Russian twist',                   muscleGroup: 'core',      sets: 3, reps: 20,  weight: 10  },
  { name: 'Roue abdominale',                 muscleGroup: 'core',      sets: 3, reps: 10,  weight: 0   },
  { name: 'Mountain climbers',               muscleGroup: 'core',      sets: 3, reps: 30,  weight: 0   },
  { name: 'Dragon flag',                     muscleGroup: 'core',      sets: 3, reps: 8,   weight: 0   },
  { name: 'Obliques câble',                  muscleGroup: 'core',      sets: 3, reps: 15,  weight: 20  },

  // ── Cardio ────────────────────────────────────────────────────────
  { name: 'Course à pied',                   muscleGroup: 'cardio',    sets: 1, reps: 30,  weight: 0   },
  { name: 'Vélo elliptique',                 muscleGroup: 'cardio',    sets: 1, reps: 30,  weight: 0   },
  { name: 'Vélo stationnaire',               muscleGroup: 'cardio',    sets: 1, reps: 30,  weight: 0   },
  { name: 'Rameur',                          muscleGroup: 'cardio',    sets: 1, reps: 20,  weight: 0   },
  { name: 'Corde à sauter',                  muscleGroup: 'cardio',    sets: 3, reps: 100, weight: 0   },
  { name: 'HIIT',                            muscleGroup: 'cardio',    sets: 1, reps: 20,  weight: 0   },
  { name: 'Natation',                        muscleGroup: 'cardio',    sets: 1, reps: 30,  weight: 0   },
  { name: 'Sac de frappe',                   muscleGroup: 'cardio',    sets: 3, reps: 180, weight: 0   },
];

// Fallback par mot-clé quand le nom d'exercice ne correspond pas exactement à la BDD
export function inferGroup(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('couché') || n.includes('écarté') || n.includes('pec') || n.includes('dip') || n.includes('pompe') || n.includes('pull-over')) return 'chest';
  if (n.includes('traction') || n.includes('rowing') || n.includes('tirage') || n.includes('soulevé') || n.includes('shrug') || n.includes('face pull')) return 'back';
  if (n.includes('squat') || n.includes('presse') || n.includes('fente') || n.includes('leg ') || n.includes('mollet') || n.includes('hip thrust') || n.includes('roumain') || n.includes('hack')) return 'legs';
  if (n.includes('militaire') || n.includes('élévation') || n.includes('arnold') || n.includes('upright') || n.includes('oiseau') || n.includes('épaule')) return 'shoulders';
  if (n.includes('curl') || n.includes('triceps') || n.includes('skull') || n.includes('serré') || n.includes('kickback') || n.includes('extension')) return 'arms';
  if (n.includes('crunch') || n.includes('gainage') || n.includes('relevé') || n.includes('russian') || n.includes('roue') || n.includes('oblique') || n.includes('mountain') || n.includes('dragon')) return 'core';
  if (n.includes('course') || n.includes('vélo') || n.includes('rameur') || n.includes('corde') || n.includes('hiit') || n.includes('natation') || n.includes('sac')) return 'cardio';
  return null;
}
