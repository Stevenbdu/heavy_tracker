# Heavy Tracker — Documentation

Application mobile de suivi d'entraînement musculaire.  
Stack : **Expo / React Native** (frontend) + **Next.js / Prisma / PostgreSQL** (backend).

---

## Fonctionnalités

### Programmes
- Création manuelle d'un programme (nom, description)
- Création depuis un template (5 modèles : Split, PPL, Upper/Lower, PPL+Upper, Full Body)
- Gestion des séances (templates) dans chaque programme : ajout, renommage, suppression
- Gestion des exercices dans chaque séance : ajout depuis la BDD, création manuelle, édition, suppression
- **Programme actif** : un seul programme peut être actif à la fois, affiché en priorité sur l'accueil

### Séances
- Démarrage d'une séance depuis un template
- Suivi en temps réel : log de chaque série (poids réel, reps réelles, RPE)
- Ajout / suppression de séries et d'exercices pendant la séance
- Notes par exercice
- Validation de la séance (statut `completed`)

### Progression automatique
Trois modes configurables par exercice :
- **DOUBLE_PROGRESSION** : monte les reps jusqu'au `maxReps`, puis augmente le poids de `weightIncrement`
- **REPS_ONLY** : monte uniquement les reps jusqu'au maximum (poids fixe)
- **MANUAL** : pas de progression automatique

Le backend applique l'algo à chaque démarrage de séance : si 85 %+ des séries de la dernière séance sont complètes, les targets sont avancés.

### Templates de programmes
Wizard en 3 étapes :
1. Choix du modèle (5 programmes pré-construits)
2. Questionnaire de force : poids × reps → calcul automatique du 1RM (formule d'Epley)
3. Aperçu final avec poids ajustés selon les 1RM → création en base

### Statistiques
- **Progression** : courbe du poids max ou tonnage par exercice, filtrable par type de séance et fenêtre temporelle (30j / 3m / 6m / tout)
- **Tonnage par groupe musculaire** : graphe multi-lignes sur 6 semaines glissantes, toggles par groupe
- **Records** : calculateur 1RM (Epley), classement des meilleurs lifts
- **Historique** : heatmap d'activité 5 semaines, séances groupées par template avec delta de tonnage

### Corps (mensurations)
- Saisie de 9 mesures : poids, taille, poitrine, abdomen, hanches, bras D/G, cuisses D/G
- Grille des dernières valeurs avec delta vs mesure précédente
- Graphe d'évolution par métrique (12 dernières entrées)
- Historique complet avec suppression par entrée

---

## Architecture

### Frontend — `frontend/`

```
app/
  _layout.tsx              Stack navigator racine
  (tabs)/
    _layout.tsx            Tab bar (4 onglets)
    index.tsx              Accueil : programme actif + dernières séances
    programs.tsx           Gestion des programmes et séances
    history.tsx            Stats (Progression / Records / Historique)
    body.tsx               Suivi des mensurations
  session/
    [id].tsx               Séance en cours
    preview/[templateId].tsx  Aperçu avant démarrage
  history/[id].tsx         Détail d'une séance terminée
  program-setup.tsx        Wizard création depuis template

components/
  charts.tsx               LineChart + MultiLineChart (SVG, react-native-svg)
  Heatmap.tsx              Heatmap d'activité

lib/
  api.ts                   Client HTTP + types TypeScript (Program, Session, BodyMetric…)
  exercises.ts             BDD des exercices (82 exos) + MUSCLE_GROUPS + inferGroup()
  programTemplates.ts      Définitions des 5 programmes templates + calcul 1RM (Epley)
  theme.ts                 Couleurs, espacements, rayons (dark theme)
  alert.ts                 Helpers confirm/info (Alert natif)
```

**Navigation** : expo-router (file-based). Tabs + Stack imbriqués.  
**Thème** : dark uniquement, couleur d'accent verte `#00E87A`.

### Backend — `backend/`

```
app/api/
  programs/
    route.ts               GET (liste) · POST (créer)
    [id]/route.ts          GET · PUT (modifier) · DELETE
    [id]/activate/route.ts PATCH — active ce programme, désactive les autres
    [id]/templates/route.ts POST (créer séance)
  templates/
    [id]/route.ts          PUT · DELETE
    [id]/exercises/route.ts POST (ajouter exercice)
  exercises/
    [id]/route.ts          PUT · DELETE
  sessions/
    route.ts               POST (démarrer — applique la progression auto)
    [id]/route.ts          GET · PATCH (compléter) · DELETE
    recent/route.ts        GET — 10 dernières
    history/route.ts       GET — toutes les séances complétées
    [id]/exercises/[eId]/route.ts        PATCH (note) · DELETE
    [id]/exercises/[eId]/sets/route.ts   POST (ajouter série)
    [id]/exercises/[eId]/sets/[sId]/route.ts  PATCH (logger) · DELETE
  metrics/
    route.ts               GET (liste) · POST (créer)
    [id]/route.ts          DELETE

lib/prisma.ts              Instance Prisma singleton
prisma/schema.prisma       Schéma de la base
```

**Framework** : Next.js App Router (API Routes uniquement, pas de pages).  
**ORM** : Prisma avec PostgreSQL.  
**DB** : `heavy_tracker` en local sur `localhost:5432`.

### Modèle de données

```
Program
  id, name, description, isActive, createdAt
  └── WorkoutTemplate[]
        id, name, order, programId
        └── ExerciseTemplate[]
              id, name, targetSets, targetReps, targetWeight
              maxReps, weightIncrement, progressionType, order

WorkoutSession
  id, date, status (in_progress | completed), workoutTemplateId
  └── LoggedExercise[]
        id, name, note
        └── LoggedSet[]
              id, setNumber, targetReps, targetWeight
              actualReps?, actualWeight?, rpe?, completed

BodyMetric
  id, date
  weight?, height?, chest?, waist?, hips?
  armR?, armL?, thighR?, thighL?
```

---

## Algorithme de progression

À chaque `POST /api/sessions`, le backend :
1. Récupère la dernière séance du même template
2. Pour chaque exercice, calcule le taux de completion (`sériesComplètes / sériesTotales`)
3. Si ≥ 85 % :
   - **DOUBLE_PROGRESSION** : si `targetReps < maxReps` → `targetReps++`, sinon `targetWeight += weightIncrement` et `targetReps` revient à la valeur initiale
   - **REPS_ONLY** : si `targetReps < maxReps` → `targetReps++`
   - **MANUAL** : aucun changement
4. Crée la session avec les nouveaux targets

## Calcul du 1RM — Formule d'Epley

```
1RM = poids × (1 + reps / 30)
```

Utilisé dans :
- Le wizard de création de programme (ajustement automatique des poids)
- L'onglet Records (calculateur manuel + classement des lifts)

---

## Lancer le projet

```bash
# Backend
cd backend
npm install
npx prisma db push      # sync schéma → DB
npm run dev             # http://localhost:3000

# Frontend
cd frontend
npm install
# Modifier lib/api.ts : mettre l'IP locale si test sur iPhone physique
npx expo start
```

**Variable d'environnement frontend** : `EXPO_PUBLIC_API_URL` (défaut : `http://192.168.1.22:3000`)
