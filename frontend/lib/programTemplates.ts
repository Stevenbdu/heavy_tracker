import { ProgressionType } from './api';

// ── Types ─────────────────────────────────────────────────────────
export type ProgramType = 'split' | 'ppl' | 'upper_lower' | 'ppl_upper' | 'fullbody';

export type TemplateExerciseDef = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  maxReps: number;
  weightIncrement: number;
  progressionType: ProgressionType;
  rmKey?: RMKey;
  rmPct?: number;
};

export type TemplateDef = {
  name: string;
  exercises: TemplateExerciseDef[];
};

export type ProgramDef = {
  id: ProgramType;
  label: string;
  description: string;
  icon: string;
  frequency: string;
  templates: TemplateDef[];
};

// ── Exercices composés pour le questionnaire RM ───────────────────
export type RMKey = 'squat' | 'bench' | 'deadlift' | 'ohp';

export const RM_EXERCISES: { key: RMKey; label: string; hint: string }[] = [
  { key: 'squat',    label: 'Squat barre',               hint: 'Meilleur squat réalisé proprement' },
  { key: 'bench',    label: 'Développé couché barre',    hint: 'Meilleur développé couché' },
  { key: 'deadlift', label: 'Soulevé de terre',          hint: 'Meilleur soulevé de terre' },
  { key: 'ohp',      label: 'Développé militaire barre', hint: 'Meilleur overhead press' },
];

// ── Calcul du poids depuis un 1RM ─────────────────────────────────
export function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function weightFromRM(rm: number, targetReps: number, increment = 2.5): number {
  const pct =
    targetReps <= 3  ? 0.90 :
    targetReps <= 5  ? 0.85 :
    targetReps <= 8  ? 0.75 :
    targetReps <= 10 ? 0.70 :
    targetReps <= 12 ? 0.65 : 0.60;
  const raw = rm * pct;
  return Math.max(Math.round(raw / increment) * increment, increment);
}

// ── Structures des programmes ─────────────────────────────────────
export const PROGRAM_DEFS: ProgramDef[] = [

  // ── Split (4j) ────────────────────────────────────────────────
  {
    id: 'split',
    label: 'Split',
    description: '4 séances / semaine. Un groupe musculaire par séance, volume maximal.',
    icon: '🎯',
    frequency: '4j / semaine',
    templates: [
      {
        name: 'Poitrine & Triceps',
        exercises: [
          { name: 'Développé couché barre',      sets: 4, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 1.0 },
          { name: 'Développé incliné haltères',  sets: 3, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.55 },
          { name: 'Développé décliné barre',     sets: 3, reps: 10, weight: 60, maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.85 },
          { name: 'Écarté poulie basse',         sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Dips lestés',                 sets: 3, reps: 10, weight: 0,  maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Extension triceps corde',     sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Skull crusher barre EZ',      sets: 3, reps: 10, weight: 25, maxReps: 12, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Dos & Biceps',
        exercises: [
          { name: 'Soulevé de terre',            sets: 4, reps: 5,  weight: 80, maxReps: 6,  weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'deadlift', rmPct: 1.0 },
          { name: 'Rowing barre',                sets: 4, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench',    rmPct: 0.65 },
          { name: 'Tractions pronation',         sets: 3, reps: 8,  weight: 0,  maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Tirage poulie haute prise large', sets: 3, reps: 10, weight: 50, maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Rowing haltère unilatéral',   sets: 3, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Curl biceps barre',           sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Curl marteau haltères',       sets: 3, reps: 12, weight: 14, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Épaules',
        exercises: [
          { name: 'Développé militaire barre',   sets: 4, reps: 8,  weight: 40, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'ohp', rmPct: 1.0 },
          { name: 'Développé militaire haltères',sets: 3, reps: 10, weight: 18, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'ohp', rmPct: 0.55 },
          { name: 'Élévations latérales haltères',sets: 4, reps: 15,weight: 10, maxReps: 20, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Élévations frontales haltères',sets: 3, reps: 12,weight: 10, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Face pull',                   sets: 3, reps: 15, weight: 20, maxReps: 20, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Shrug haltères',              sets: 3, reps: 15, weight: 30, maxReps: 20, weightIncrement: 2,   progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Jambes',
        exercises: [
          { name: 'Squat barre',                 sets: 4, reps: 8,  weight: 80, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.0 },
          { name: 'Presse à cuisses',            sets: 3, reps: 10, weight: 120,maxReps: 12, weightIncrement: 5,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.8 },
          { name: 'Soulevé de terre roumain',    sets: 3, reps: 10, weight: 60, maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'deadlift', rmPct: 0.55 },
          { name: 'Fentes bulgares haltères',    sets: 3, reps: 10, weight: 20, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Leg curl couché',             sets: 3, reps: 12, weight: 30, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Leg extension',               sets: 3, reps: 12, weight: 35, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Mollets debout',              sets: 4, reps: 15, weight: 50, maxReps: 20, weightIncrement: 5,   progressionType: 'REPS_ONLY' },
        ],
      },
    ],
  },

  // ── PPL (6j) ──────────────────────────────────────────────────
  {
    id: 'ppl',
    label: 'Push Pull Legs',
    description: '6 séances / semaine. Haute fréquence, idéal pour les intermédiaires.',
    icon: '⚡',
    frequency: '6j / semaine',
    templates: [
      {
        name: 'Push',
        exercises: [
          { name: 'Développé couché barre',      sets: 4, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 1.0 },
          { name: 'Développé incliné haltères',  sets: 3, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.55 },
          { name: 'Écarté poulie basse',         sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Développé militaire haltères',sets: 3, reps: 10, weight: 18, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'ohp',   rmPct: 0.55 },
          { name: 'Élévations latérales haltères',sets: 3, reps: 15,weight: 10, maxReps: 20, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Extension triceps corde',     sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          { name: 'Tractions pronation',         sets: 4, reps: 8,  weight: 0,  maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Rowing barre',                sets: 4, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.65 },
          { name: 'Tirage poulie haute prise large',sets: 3, reps: 10, weight: 50, maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Face pull',                   sets: 3, reps: 15, weight: 20, maxReps: 20, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Curl biceps barre',           sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Curl marteau haltères',       sets: 3, reps: 12, weight: 14, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Squat barre',                 sets: 4, reps: 8,  weight: 80, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.0 },
          { name: 'Presse à cuisses',            sets: 3, reps: 10, weight: 120,maxReps: 12, weightIncrement: 5,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.8 },
          { name: 'Soulevé de terre roumain',    sets: 3, reps: 10, weight: 60, maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'deadlift', rmPct: 0.55 },
          { name: 'Leg curl couché',             sets: 3, reps: 12, weight: 30, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Leg extension',               sets: 3, reps: 12, weight: 35, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Mollets debout',              sets: 4, reps: 15, weight: 50, maxReps: 20, weightIncrement: 5,   progressionType: 'REPS_ONLY' },
        ],
      },
    ],
  },

  // ── Upper / Lower (4j) ────────────────────────────────────────
  {
    id: 'upper_lower',
    label: 'Upper / Lower',
    description: '4 séances / semaine. Bon équilibre volume et fréquence.',
    icon: '🔄',
    frequency: '4j / semaine',
    templates: [
      {
        name: 'Upper A',
        exercises: [
          { name: 'Développé couché barre',      sets: 4, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 1.0 },
          { name: 'Rowing barre',                sets: 4, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.65 },
          { name: 'Développé militaire barre',   sets: 3, reps: 8,  weight: 40, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'ohp',   rmPct: 1.0 },
          { name: 'Tractions pronation',         sets: 3, reps: 8,  weight: 0,  maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Curl biceps barre EZ',        sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Extension triceps corde',     sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Lower A',
        exercises: [
          { name: 'Squat barre',                 sets: 4, reps: 8,  weight: 80, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.0 },
          { name: 'Soulevé de terre roumain',    sets: 3, reps: 10, weight: 60, maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'deadlift', rmPct: 0.55 },
          { name: 'Leg curl couché',             sets: 3, reps: 12, weight: 30, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Leg extension',               sets: 3, reps: 12, weight: 35, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Mollets debout',              sets: 4, reps: 15, weight: 50, maxReps: 20, weightIncrement: 5,   progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Upper B',
        exercises: [
          { name: 'Développé incliné haltères',  sets: 4, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.55 },
          { name: 'Rowing haltère unilatéral',   sets: 3, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Élévations latérales haltères',sets: 3, reps: 15,weight: 10, maxReps: 20, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Face pull',                   sets: 3, reps: 15, weight: 20, maxReps: 20, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Curl marteau haltères',       sets: 3, reps: 12, weight: 14, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Skull crusher barre EZ',      sets: 3, reps: 10, weight: 25, maxReps: 12, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Lower B',
        exercises: [
          { name: 'Soulevé de terre',            sets: 4, reps: 5,  weight: 80, maxReps: 6,  weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'deadlift', rmPct: 1.0 },
          { name: 'Presse à cuisses',            sets: 3, reps: 10, weight: 120,maxReps: 12, weightIncrement: 5,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.8 },
          { name: 'Fentes bulgares haltères',    sets: 3, reps: 10, weight: 20, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Leg curl assis',              sets: 3, reps: 12, weight: 30, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Mollets assis',               sets: 4, reps: 15, weight: 30, maxReps: 20, weightIncrement: 5,   progressionType: 'REPS_ONLY' },
        ],
      },
    ],
  },

  // ── PPL + Upper (4-5j) ────────────────────────────────────────
  {
    id: 'ppl_upper',
    label: 'PPL + Upper',
    description: '4-5 séances / semaine. PPL avec une séance Upper bonus pour fréquence accrue.',
    icon: '🔥',
    frequency: '4-5j / semaine',
    templates: [
      {
        name: 'Push',
        exercises: [
          { name: 'Développé couché barre',      sets: 4, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 1.0 },
          { name: 'Développé incliné haltères',  sets: 3, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.55 },
          { name: 'Développé militaire barre',   sets: 3, reps: 8,  weight: 40, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'ohp',   rmPct: 1.0 },
          { name: 'Élévations latérales haltères',sets: 3, reps: 15,weight: 10, maxReps: 20, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Extension triceps corde',     sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Dips lestés',                 sets: 3, reps: 10, weight: 0,  maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          { name: 'Tractions pronation',         sets: 4, reps: 8,  weight: 0,  maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Rowing barre',                sets: 4, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.65 },
          { name: 'Tirage poulie haute prise large',sets: 3, reps: 10, weight: 50, maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Face pull',                   sets: 3, reps: 15, weight: 20, maxReps: 20, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Curl biceps barre',           sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Curl marteau haltères',       sets: 3, reps: 12, weight: 14, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Squat barre',                 sets: 4, reps: 8,  weight: 80, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.0 },
          { name: 'Presse à cuisses',            sets: 3, reps: 10, weight: 120,maxReps: 12, weightIncrement: 5,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.8 },
          { name: 'Soulevé de terre roumain',    sets: 3, reps: 10, weight: 60, maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'deadlift', rmPct: 0.55 },
          { name: 'Leg curl couché',             sets: 3, reps: 12, weight: 30, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Leg extension',               sets: 3, reps: 12, weight: 35, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Mollets debout',              sets: 4, reps: 15, weight: 50, maxReps: 20, weightIncrement: 5,   progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Upper (bonus)',
        exercises: [
          { name: 'Développé couché haltères',   sets: 3, reps: 10, weight: 28, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench', rmPct: 0.6 },
          { name: 'Rowing haltère unilatéral',   sets: 3, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Arnold press',                sets: 3, reps: 10, weight: 16, maxReps: 12, weightIncrement: 2,   progressionType: 'REPS_ONLY' },
          { name: 'Tirage poulie haute prise serrée',sets: 3, reps: 12, weight: 45, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
          { name: 'Curl haltères alterné',       sets: 3, reps: 12, weight: 14, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Extension triceps poulie',    sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
        ],
      },
    ],
  },

  // ── Full Body (3j) ────────────────────────────────────────────
  {
    id: 'fullbody',
    label: 'Full Body',
    description: '3 séances / semaine. Idéal pour les débutants et pour les phases de force.',
    icon: '💪',
    frequency: '3j / semaine',
    templates: [
      {
        name: 'Full Body A',
        exercises: [
          { name: 'Squat barre',                 sets: 3, reps: 8,  weight: 80, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.0 },
          { name: 'Développé couché barre',      sets: 3, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench',    rmPct: 1.0 },
          { name: 'Rowing barre',                sets: 3, reps: 8,  weight: 60, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench',    rmPct: 0.65 },
          { name: 'Développé militaire barre',   sets: 3, reps: 8,  weight: 40, maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'ohp',      rmPct: 1.0 },
          { name: 'Curl biceps barre',           sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Extension triceps poulie',    sets: 3, reps: 12, weight: 20, maxReps: 15, weightIncrement: 2.5, progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          { name: 'Soulevé de terre',            sets: 3, reps: 5,  weight: 80, maxReps: 6,  weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'deadlift', rmPct: 1.0 },
          { name: 'Développé incliné haltères',  sets: 3, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench',    rmPct: 0.55 },
          { name: 'Tractions pronation',         sets: 3, reps: 8,  weight: 0,  maxReps: 12, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Arnold press',                sets: 3, reps: 10, weight: 16, maxReps: 12, weightIncrement: 2,   progressionType: 'REPS_ONLY' },
          { name: 'Curl marteau haltères',       sets: 3, reps: 12, weight: 14, maxReps: 15, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
          { name: 'Skull crusher barre EZ',      sets: 3, reps: 10, weight: 25, maxReps: 12, weightIncrement: 1.25,progressionType: 'REPS_ONLY' },
        ],
      },
      {
        name: 'Full Body C',
        exercises: [
          { name: 'Squat barre',                 sets: 3, reps: 5,  weight: 80, maxReps: 6,  weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION', rmKey: 'squat',    rmPct: 1.0 },
          { name: 'Développé couché haltères',   sets: 3, reps: 10, weight: 28, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'bench',    rmPct: 0.6 },
          { name: 'Rowing haltère unilatéral',   sets: 3, reps: 10, weight: 24, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Développé militaire haltères',sets: 3, reps: 10, weight: 18, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION', rmKey: 'ohp',      rmPct: 0.55 },
          { name: 'Fentes bulgares haltères',    sets: 3, reps: 10, weight: 20, maxReps: 12, weightIncrement: 2,   progressionType: 'DOUBLE_PROGRESSION' },
          { name: 'Mollets debout',              sets: 3, reps: 15, weight: 50, maxReps: 20, weightIncrement: 5,   progressionType: 'REPS_ONLY' },
        ],
      },
    ],
  },
];

// ── Applique les 1RM calculés aux exercices d'un template ─────────
export function applyRMs(
  templates: TemplateDef[],
  rms: Partial<Record<RMKey, number>>
): TemplateDef[] {
  return templates.map((t) => ({
    ...t,
    exercises: t.exercises.map((ex) => {
      if (!ex.rmKey || !rms[ex.rmKey]) return ex;
      const rm = rms[ex.rmKey]!;
      const targetWeight = weightFromRM(rm * (ex.rmPct ?? 1), ex.reps, ex.weightIncrement);
      return { ...ex, weight: targetWeight };
    }),
  }));
}
