// Change cette IP par l'adresse locale de ton PC quand tu utilises l'iPhone en local
// Ex: "http://192.168.1.22:3000"
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.22:3000';
// const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';


async function request<T>(path: string, options?: RequestInit): Promise<T> {
  console.log(path)
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Types ---

export type Program = {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  templates: WorkoutTemplate[];
};

export type WorkoutTemplate = {
  id: number;
  name: string;
  order: number;
  programId: number;
  exercises: ExerciseTemplate[];
};

export type ProgressionType = 'DOUBLE_PROGRESSION' | 'REPS_ONLY' | 'MANUAL' | 'FORCE';

export type ExerciseTemplate = {
  id: number;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  order: number;
  maxReps: number;
  weightIncrement: number;
  progressionType: ProgressionType;
};

export type WorkoutSession = {
  id: number;
  date: string;
  status: 'in_progress' | 'completed';
  workoutTemplate: WorkoutTemplate & { program: Program };
  loggedExercises: LoggedExercise[];
};

export type LoggedExercise = {
  id: number;
  name: string;
  note?: string;
  sets: LoggedSet[];
};

export type LoggedSet = {
  id: number;
  setNumber: number;
  targetReps: number;
  targetWeight: number;
  actualReps?: number;
  actualWeight?: number;
  rpe?: number;
  completed: boolean;
};

export type BodyMetric = {
  id: number;
  date: string;
  weight?: number;
  height?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  armR?: number;
  armL?: number;
  thighR?: number;
  thighL?: number;
};

// --- Programs ---

export const api = {
  programs: {
    list: () => request<Program[]>('/api/programs'),
    get: (id: number) => request<Program>(`/api/programs/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Program>('/api/programs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; description?: string }) =>
      request<Program>(`/api/programs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/api/programs/${id}`, { method: 'DELETE' }),
    activate: (id: number) =>
      request<void>(`/api/programs/${id}/activate`, { method: 'PATCH' }),
  },

  templates: {
    get: (id: number) => request<WorkoutTemplate>(`/api/templates/${id}`),
    create: (programId: number, data: { name: string; order?: number }) =>
      request<WorkoutTemplate>(`/api/programs/${programId}/templates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { name?: string; order?: number }) =>
      request<WorkoutTemplate>(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/api/templates/${id}`, { method: 'DELETE' }),
  },

  exercises: {
    create: (
      templateId: number,
      data: {
        name: string;
        targetSets: number;
        targetReps: number;
        targetWeight?: number;
        order?: number;
        maxReps?: number;
        weightIncrement?: number;
        progressionType?: ProgressionType;
      }
    ) =>
      request<ExerciseTemplate>(`/api/templates/${templateId}/exercises`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: {
        name?: string;
        targetSets?: number;
        targetReps?: number;
        targetWeight?: number;
        order?: number;
        maxReps?: number;
        weightIncrement?: number;
        progressionType?: ProgressionType;
      }
    ) =>
      request<ExerciseTemplate>(`/api/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/api/exercises/${id}`, { method: 'DELETE' }),
  },

  sessions: {
    start: (workoutTemplateId: number) =>
      request<WorkoutSession>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ workoutTemplateId }),
      }),
    get: (id: number) => request<WorkoutSession>(`/api/sessions/${id}`),
    complete: (id: number) =>
      request<WorkoutSession>(`/api/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      }),
    delete: (id: number) =>
      request<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
    recent: () => request<WorkoutSession[]>('/api/sessions/recent'),
    history: () => request<WorkoutSession[]>('/api/sessions/history'),
    addSet: (
      sessionId: number,
      exerciseId: number,
      data: { targetWeight: number; targetReps: number; actualWeight: number; actualReps: number }
    ) =>
      request<LoggedSet>(
        `/api/sessions/${sessionId}/exercises/${exerciseId}/sets`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    logSet: (
      sessionId: number,
      exerciseId: number,
      setId: number,
      data: { actualReps?: number; actualWeight?: number; rpe?: number; completed?: boolean }
    ) =>
      request<LoggedSet>(
        `/api/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`,
        { method: 'PATCH', body: JSON.stringify(data) }
      ),
    deleteSet: (sessionId: number, exerciseId: number, setId: number) =>
      request<void>(
        `/api/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`,
        { method: 'DELETE' }
      ),
    deleteExercise: (sessionId: number, exerciseId: number) =>
      request<void>(
        `/api/sessions/${sessionId}/exercises/${exerciseId}`,
        { method: 'DELETE' }
      ),
    updateExerciseNote: (sessionId: number, exerciseId: number, note: string) =>
      request<LoggedExercise>(
        `/api/sessions/${sessionId}/exercises/${exerciseId}`,
        { method: 'PATCH', body: JSON.stringify({ note }) }
      ),
  },

  metrics: {
    list: () => request<BodyMetric[]>('/api/metrics'),
    create: (data: Omit<BodyMetric, 'id' | 'date'>) =>
      request<BodyMetric>('/api/metrics', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/api/metrics/${id}`, { method: 'DELETE' }),
  },
};
