// Dark Neon — design tokens validés
export const colors = {
  bg:          '#0a0a0a',
  surface1:    '#111111',
  surface2:    '#1a1a1a',
  surface3:    '#242424',
  divider:     '#2a2a2a',
  text:        '#f0f0f0',
  textMuted:   '#666666',
  accent:      '#00E87A',
  accentText:  '#0a0a0a',
  accentBg:    '#0f2318',  // fond vert sombre (chips actifs, badges)
  accentBgDeep:'#0f1f10',  // fond vert très sombre (carte séance en cours)
  overlay:     'rgba(0,0,0,0.85)',
  danger:      '#FF3B30',
  dangerBg:    '#2a1515',  // fond rouge sombre (delta négatif)
  warning:     '#f59e0b',
  warningBg:   '#1a1200',  // fond orange sombre (streak)
  warningBgLight: '#1f1a00', // fond jaune sombre (record badge)
  warningBorder:  '#3d2e00',
  purpleBg:    '#1a0f2e',  // fond violet sombre (bouton Template)

  // Alias de rétrocompatibilité
  card:        '#1a1a1a',
  border:      '#2a2a2a',
  borderLight: '#2a2a2a',
  textSub:     '#888888',
  textDim:     '#444444',
  accentDim:   '#001f10',
  success:     '#00E87A',
  successDim:  '#001f10',
};

export const radius = {
  xs:  6,
  sm:  8,
  md:  10,
  lg:  14,
  xl:  16,
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  20,
  xl:  24,
  xxl: 32,
};

// Accents par programme (utilisé dans l'historique)
export const programAccents = [
  '#00E87A', '#3b82f6', '#a855f7',
  '#f97316', '#ec4899', '#eab308', '#06b6d4',
];
