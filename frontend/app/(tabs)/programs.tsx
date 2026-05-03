import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api, Program, WorkoutTemplate, ExerciseTemplate, WorkoutSession, ProgressionType } from '@/lib/api';
import { colors, radius, spacing, programAccents } from '@/lib/theme';
import { confirmAlert, infoAlert } from '@/lib/alert';
import { MUSCLE_GROUPS, EXERCISES } from '@/lib/exercises';

type ModalState =
  | { type: 'none' }
  | { type: 'newProgram' }
  | { type: 'editProgram'; id: number; currentName: string; currentDesc: string }
  | { type: 'newTemplate'; programId: number }
  | { type: 'editTemplate'; id: number; currentName: string }
  | { type: 'pickCategory'; templateId: number; templateName: string }
  | { type: 'pickExercise'; templateId: number; templateName: string; categoryId: string }
  | { type: 'newExercise'; templateId: number; templateName: string }
  | { type: 'editExercise'; id: number; currentName: string; currentSets: string; currentReps: string; currentWeight: string; currentMaxReps: string; currentWeightIncrement: string; currentProgressionType: ProgressionType };

function getProgressionPreset(muscleGroup: string): { maxReps: number; weightIncrement: number; progressionType: ProgressionType } {
  if (muscleGroup === 'legs' || muscleGroup === 'chest' || muscleGroup === 'back') {
    return { maxReps: 10, weightIncrement: 2.5, progressionType: 'DOUBLE_PROGRESSION' };
  }
  if (muscleGroup === 'arms' || muscleGroup === 'shoulders') {
    return { maxReps: 15, weightIncrement: 1.25, progressionType: 'REPS_ONLY' };
  }
  return { maxReps: 15, weightIncrement: 0, progressionType: 'MANUAL' };
}

function countTemplateSets(template: WorkoutTemplate) {
  return template.exercises.reduce((sum, ex) => sum + ex.targetSets, 0);
}

function computeSemaine(program: Program, sessions: WorkoutSession[]) {
  const templateIds = new Set(program.templates.map((t) => t.id));
  const count = sessions.filter(
    (s) => s.status === 'completed' && templateIds.has(s.workoutTemplate.id)
  ).length;
  if (count === 0 || program.templates.length === 0) return null;
  return Math.ceil(count / program.templates.length) + 1;
}

export default function ProgramsScreen() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Modal
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [inputName, setInputName] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [inputSets, setInputSets] = useState('3');
  const [inputReps, setInputReps] = useState('8');
  const [inputWeight, setInputWeight] = useState('0');
  const [inputMaxReps, setInputMaxReps] = useState('12');
  const [inputWeightIncrement, setInputWeightIncrement] = useState('2.5');
  const [inputProgressionType, setInputProgressionType] = useState<ProgressionType>('DOUBLE_PROGRESSION');
  const [saving, setSaving] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [progs, sessions] = await Promise.all([
        api.programs.list(),
        api.sessions.recent(),
      ]);
      setPrograms(progs);
      setRecentSessions(sessions);
      setSelectedId((prev) => {
        if (prev && progs.find((p) => p.id === prev)) return prev;
        return progs[0]?.id ?? null;
      });
    } catch {
      infoAlert('Erreur', 'Impossible de charger les programmes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const closeModal = () => setModal({ type: 'none' });

  const openCreate = (m: ModalState) => {
    setInputName(''); setInputDesc('');
    setInputSets('3'); setInputReps('8'); setInputWeight('0');
    setInputMaxReps('12'); setInputWeightIncrement('2.5'); setInputProgressionType('DOUBLE_PROGRESSION');
    setModal(m);
  };

  const openEdit = (m: ModalState) => {
    if (m.type === 'editProgram') { setInputName(m.currentName); setInputDesc(m.currentDesc); }
    else if (m.type === 'editTemplate') { setInputName(m.currentName); }
    else if (m.type === 'editExercise') {
      setInputName(m.currentName);
      setInputSets(m.currentSets);
      setInputReps(m.currentReps);
      setInputWeight(m.currentWeight);
      setInputMaxReps(m.currentMaxReps);
      setInputWeightIncrement(m.currentWeightIncrement);
      setInputProgressionType(m.currentProgressionType);
    }
    setModal(m);
  };

  const selectExercise = (templateId: number, templateName: string, name: string, sets: number, reps: number, weight: number, muscleGroup: string) => {
    setInputName(name);
    setInputSets(String(sets));
    setInputReps(String(reps));
    setInputWeight(String(weight));
    const preset = getProgressionPreset(muscleGroup);
    setInputMaxReps(String(preset.maxReps));
    setInputWeightIncrement(String(preset.weightIncrement));
    setInputProgressionType(preset.progressionType);
    setExerciseSearch('');
    setModal({ type: 'newExercise', templateId, templateName });
  };

  const handleSave = async () => {
    if (modal.type === 'none' || modal.type === 'pickCategory' || modal.type === 'pickExercise') return;
    if (!inputName.trim()) return;
    setSaving(true);
    try {
      switch (modal.type) {
        case 'newProgram':
          await api.programs.create({ name: inputName.trim(), description: inputDesc.trim() || undefined });
          break;
        case 'editProgram':
          await api.programs.update(modal.id, { name: inputName.trim(), description: inputDesc.trim() || undefined });
          break;
        case 'newTemplate': {
          const count = programs.find((p) => p.id === modal.programId)?.templates.length ?? 0;
          await api.templates.create(modal.programId, { name: inputName.trim(), order: count });
          break;
        }
        case 'editTemplate':
          await api.templates.update(modal.id, { name: inputName.trim() });
          break;
        case 'newExercise':
          await api.exercises.create(modal.templateId, {
            name: inputName.trim(),
            targetSets: parseInt(inputSets) || 3,
            targetReps: parseInt(inputReps) || 8,
            targetWeight: parseFloat(inputWeight) || 0,
            maxReps: parseInt(inputMaxReps) || 12,
            weightIncrement: parseFloat(inputWeightIncrement) || 0,
            progressionType: inputProgressionType,
          });
          break;
        case 'editExercise':
          await api.exercises.update(modal.id, {
            name: inputName.trim(),
            targetSets: parseInt(inputSets) || 3,
            targetReps: parseInt(inputReps) || 8,
            targetWeight: parseFloat(inputWeight) || 0,
            maxReps: parseInt(inputMaxReps) || 12,
            weightIncrement: parseFloat(inputWeightIncrement) || 0,
            progressionType: inputProgressionType,
          });
          break;
      }
      closeModal();
      load();
    } catch {
      infoAlert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = (p: Program) =>
    confirmAlert(`Supprimer "${p.name}" ?`, 'Irréversible.', async () => {
      try { await api.programs.delete(p.id); load(); }
      catch { infoAlert('Erreur', 'Impossible de supprimer'); }
    }, 'Supprimer');

  const handleDeleteTemplate = (t: WorkoutTemplate) =>
    confirmAlert(`Supprimer "${t.name}" ?`, 'Irréversible.', async () => {
      try { await api.templates.delete(t.id); load(); }
      catch { infoAlert('Erreur', 'Impossible de supprimer'); }
    }, 'Supprimer');

  const handleDeleteExercise = (ex: ExerciseTemplate) =>
    confirmAlert(`Supprimer "${ex.name}" ?`, 'Irréversible.', async () => {
      try { await api.exercises.delete(ex.id); load(); }
      catch { infoAlert('Erreur', 'Impossible de supprimer'); }
    }, 'Supprimer');

  const handleGo = (templateId: number) => {
    router.push(`/session/preview/${templateId}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const selectedProgram = programs.find((p) => p.id === selectedId) ?? null;
  const semaine = selectedProgram ? computeSemaine(selectedProgram, recentSessions) : null;
  const selectedIdx = programs.findIndex((p) => p.id === selectedId);
  const accentColor = selectedIdx >= 0 ? programAccents[selectedIdx % programAccents.length] : colors.accent;

  const isFormModal =
    modal.type === 'newProgram' ||
    modal.type === 'editProgram' ||
    modal.type === 'newTemplate' ||
    modal.type === 'editTemplate' ||
    modal.type === 'newExercise' ||
    modal.type === 'editExercise';

  const isExerciseModal = modal.type === 'newExercise' || modal.type === 'editExercise';
  const isProgramModal = modal.type === 'newProgram' || modal.type === 'editProgram';
  const isEdit = modal.type === 'editProgram' || modal.type === 'editTemplate' || modal.type === 'editExercise';

  const filteredExercises =
    modal.type === 'pickExercise'
      ? EXERCISES.filter(
          (e) =>
            e.muscleGroup === modal.categoryId &&
            (exerciseSearch === '' || e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
        )
      : [];

  const modalTitles: Record<ModalState['type'], string> = {
    none: '',
    newProgram: 'Nouveau programme',
    editProgram: 'Modifier le programme',
    newTemplate: 'Nouvelle séance',
    editTemplate: 'Modifier la séance',
    pickCategory: 'Groupe musculaire',
    pickExercise: MUSCLE_GROUPS.find((g) => modal.type === 'pickExercise' && g.id === modal.categoryId)?.name ?? 'Exercices',
    newExercise: 'Ajouter un exercice',
    editExercise: "Modifier l'exercice",
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Programmes</Text>
          {selectedProgram && (
            <Text style={styles.screenSub}>
              {selectedProgram.name}
              {semaine ? ` · Semaine ${semaine}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Program tab selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabScrollContent}
      >
        {programs.map((prog, idx) => {
          const isActive = prog.id === selectedId;
          const color = programAccents[idx % programAccents.length];
          return (
            <TouchableOpacity
              key={prog.id}
              style={[
                styles.programTab,
                isActive && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => setSelectedId(prog.id)}
              onLongPress={() =>
                openEdit({
                  type: 'editProgram',
                  id: prog.id,
                  currentName: prog.name,
                  currentDesc: prog.description ?? '',
                })
              }
              activeOpacity={0.8}
            >
              <Text style={[styles.programTabText, isActive && styles.programTabTextActive]}>
                {prog.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.newProgramTab}
          onPress={() => openCreate({ type: 'newProgram' })}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={14} color={colors.accent} />
          <Text style={styles.newProgramTabText}>Nouveau</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Template list */}
      {selectedProgram ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Program actions (edit/delete) */}
          <View style={styles.programActions}>
            <TouchableOpacity
              style={styles.programActionBtn}
              onPress={() =>
                openEdit({
                  type: 'editProgram',
                  id: selectedProgram.id,
                  currentName: selectedProgram.name,
                  currentDesc: selectedProgram.description ?? '',
                })
              }
            >
              <Feather name="edit-2" size={13} color={colors.textMuted} />
              <Text style={styles.programActionText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.programActionBtn, styles.programActionDanger]}
              onPress={() => handleDeleteProgram(selectedProgram)}
            >
              <Feather name="trash-2" size={13} color={colors.danger} />
              <Text style={[styles.programActionText, { color: colors.danger }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>

          {selectedProgram.templates.length === 0 ? (
            <View style={styles.emptyTemplates}>
              <Text style={styles.emptyTemplatesText}>Aucune séance configurée</Text>
            </View>
          ) : (
            selectedProgram.templates.map((template, tIdx) => {
              const totalSets = countTemplateSets(template);
              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={tIdx}
                  accentColor={accentColor}
                  totalSets={totalSets}
                  onGo={() => handleGo(template.id)}
                  onEditTemplate={() =>
                    openEdit({
                      type: 'editTemplate',
                      id: template.id,
                      currentName: template.name,
                    })
                  }
                  onDeleteTemplate={() => handleDeleteTemplate(template)}
                  onAddExercise={() => {
                    setExerciseSearch('');
                    setModal({ type: 'pickCategory', templateId: template.id, templateName: template.name });
                  }}
                  onEditExercise={(ex) =>
                    openEdit({
                      type: 'editExercise',
                      id: ex.id,
                      currentName: ex.name,
                      currentSets: String(ex.targetSets),
                      currentReps: String(ex.targetReps),
                      currentWeight: String(ex.targetWeight),
                      currentMaxReps: String(ex.maxReps),
                      currentWeightIncrement: String(ex.weightIncrement),
                      currentProgressionType: ex.progressionType,
                    })
                  }
                  onDeleteExercise={handleDeleteExercise}
                />
              );
            })
          )}

          {/* Add session */}
          <TouchableOpacity
            style={styles.addSessionBtn}
            onPress={() => openCreate({ type: 'newTemplate', programId: selectedProgram.id })}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={16} color={colors.accent} />
            <Text style={styles.addSessionBtnText}>Ajouter une séance</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.emptyPrograms}>
          <Text style={styles.emptyProgramsTitle}>Aucun programme</Text>
          <Text style={styles.emptyProgramsSub}>Crée ton premier programme</Text>
        </View>
      )}

      {/* Modal */}
      <Modal
        visible={modal.type !== 'none'}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeModal} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>{modalTitles[modal.type]}</Text>
                <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Category picker */}
              {modal.type === 'pickCategory' && (
                <View style={styles.categoryGrid}>
                  {MUSCLE_GROUPS.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={[styles.categoryCard, { backgroundColor: group.bg, borderColor: group.color }]}
                      onPress={() => {
                        setExerciseSearch('');
                        setModal({ type: 'pickExercise', templateId: modal.templateId, templateName: modal.templateName, categoryId: group.id });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.categoryEmoji}>{group.emoji}</Text>
                      <Text style={[styles.categoryName, { color: group.color }]}>{group.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.categoryCard, { backgroundColor: colors.surface2, borderColor: colors.divider }]}
                    onPress={() => openCreate({ type: 'newExercise', templateId: modal.templateId, templateName: modal.templateName })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.categoryEmoji}>✎</Text>
                    <Text style={[styles.categoryName, { color: colors.textMuted }]}>Manuel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Exercise picker */}
              {modal.type === 'pickExercise' && (
                <View>
                  <TouchableOpacity
                    onPress={() => setModal({ type: 'pickCategory', templateId: modal.templateId, templateName: modal.templateName })}
                    style={styles.backBtn}
                  >
                    <Feather name="chevron-left" size={14} color={colors.accent} />
                    <Text style={styles.backBtnText}>Retour</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher…"
                    placeholderTextColor={colors.textMuted}
                    value={exerciseSearch}
                    onChangeText={setExerciseSearch}
                  />
                  <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                    {filteredExercises.map((ex) => (
                      <TouchableOpacity
                        key={ex.name}
                        style={styles.exercisePickerItem}
                        onPress={() => selectExercise(modal.templateId, modal.templateName, ex.name, ex.sets, ex.reps, ex.weight, ex.muscleGroup)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.exercisePickerName}>{ex.name}</Text>
                        <Text style={styles.exercisePickerMeta}>
                          {ex.sets}×{ex.reps}{ex.weight > 0 ? ` · ${ex.weight} kg` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Form */}
              {isFormModal && (
                <View style={{ gap: spacing.md }}>
                  <View>
                    <Text style={styles.fieldLabel}>NOM</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="Nom"
                      placeholderTextColor={colors.textMuted}
                      value={inputName}
                      onChangeText={setInputName}
                      autoFocus
                    />
                  </View>

                  {isProgramModal && (
                    <View>
                      <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="Description (optionnel)"
                        placeholderTextColor={colors.textMuted}
                        value={inputDesc}
                        onChangeText={setInputDesc}
                      />
                    </View>
                  )}

                  {isExerciseModal && (
                    <>
                      {/* Séries / Reps cibles / Poids */}
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>SÉRIES</Text>
                          <TextInput style={styles.fieldInput} keyboardType="number-pad" value={inputSets} onChangeText={setInputSets} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>REPS CIBLES</Text>
                          <TextInput style={styles.fieldInput} keyboardType="number-pad" value={inputReps} onChangeText={setInputReps} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>POIDS (kg)</Text>
                          <TextInput style={styles.fieldInput} keyboardType="decimal-pad" value={inputWeight} onChangeText={setInputWeight} />
                        </View>
                      </View>

                      {/* Mode de progression */}
                      <View>
                        <Text style={styles.fieldLabel}>MODE DE PROGRESSION</Text>
                        <View style={styles.progressionRow}>
                          {([
                            { value: 'DOUBLE_PROGRESSION', label: 'Force' },
                            { value: 'REPS_ONLY', label: 'Hypertrophie' },
                            { value: 'MANUAL', label: 'Manuel' },
                          ] as { value: ProgressionType; label: string }[]).map((opt) => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.progressionPill,
                                inputProgressionType === opt.value && styles.progressionPillActive,
                              ]}
                              onPress={() => setInputProgressionType(opt.value)}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.progressionPillText,
                                inputProgressionType === opt.value && styles.progressionPillTextActive,
                              ]}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={styles.progressionDesc}>
                          {inputProgressionType === 'DOUBLE_PROGRESSION'
                            ? 'Monte les reps jusqu\'au max, puis augmente le poids'
                            : inputProgressionType === 'REPS_ONLY'
                            ? 'Monte les reps jusqu\'au maximum (poids fixe)'
                            : 'Pas de progression automatique'}
                        </Text>
                      </View>

                      {/* Max reps + Incrément */}
                      {inputProgressionType !== 'MANUAL' && (
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>REPS MAX</Text>
                            <TextInput style={styles.fieldInput} keyboardType="number-pad" value={inputMaxReps} onChangeText={setInputMaxReps} />
                          </View>
                          {inputProgressionType === 'DOUBLE_PROGRESSION' && (
                            <View style={{ flex: 1 }}>
                              <Text style={styles.fieldLabel}>INCRÉMENT (kg)</Text>
                              <TextInput style={styles.fieldInput} keyboardType="decimal-pad" value={inputWeightIncrement} onChangeText={setInputWeightIncrement} />
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.saveBtn, (saving || !inputName.trim()) && { opacity: 0.5 }]}
                    onPress={handleSave}
                    disabled={saving || !inputName.trim()}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <ActivityIndicator color={colors.accentText} />
                    ) : (
                      <Text style={styles.saveBtnText}>{isEdit ? 'Enregistrer' : 'Créer'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Template card component ───────────────────────────────────────
function TemplateCard({
  template,
  index,
  accentColor,
  totalSets,
  onGo,
  onEditTemplate,
  onDeleteTemplate,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
}: {
  template: WorkoutTemplate;
  index: number;
  accentColor: string;
  totalSets: number;
  onGo: () => void;
  onEditTemplate: () => void;
  onDeleteTemplate: () => void;
  onAddExercise: () => void;
  onEditExercise: (ex: ExerciseTemplate) => void;
  onDeleteExercise: (ex: ExerciseTemplate) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const subtitle = [
    `${template.exercises.length} exercice${template.exercises.length !== 1 ? 's' : ''}`,
    totalSets > 0 ? `${totalSets} séries` : null,
  ].filter(Boolean).join(' · ');

  return (
    <View style={tc.card}>
      {/* Number badge + content + Go button */}
      <TouchableOpacity
        style={tc.row}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={[tc.numBadge, { backgroundColor: accentColor + '22', borderColor: accentColor + '50' }]}>
          <Text style={[tc.numText, { color: accentColor }]}>{index + 1}</Text>
        </View>

        <View style={tc.info}>
          <Text style={tc.name}>{template.name}</Text>
          <Text style={tc.sub}>{subtitle}</Text>
        </View>

        <TouchableOpacity
          style={tc.goBtn}
          onPress={onGo}
          activeOpacity={0.8}
        >
          <Text style={tc.goBtnText}>Go</Text>
        </TouchableOpacity>

        <Feather
          name={expanded ? 'chevron-up' : 'chevron-right'}
          size={14}
          color={colors.textMuted}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {/* Expanded: exercise list */}
      {expanded && (
        <View style={tc.expanded}>
          {template.exercises.map((ex) => (
            <View key={ex.id} style={tc.exRow}>
              <View style={{ flex: 1 }}>
                <Text style={tc.exName}>{ex.name}</Text>
                <Text style={tc.exMeta}>
                  {ex.targetSets}×{ex.targetReps}
                  {ex.targetWeight > 0 ? ` · ${ex.targetWeight} kg` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onEditExercise(ex)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={tc.exAction}
              >
                <Feather name="edit-2" size={13} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDeleteExercise(ex)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={tc.exAction}
              >
                <Feather name="trash-2" size={13} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={tc.addExBtn} onPress={onAddExercise} activeOpacity={0.7}>
            <Feather name="plus" size={13} color={accentColor} />
            <Text style={[tc.addExText, { color: accentColor }]}>Ajouter un exercice</Text>
          </TouchableOpacity>

          {/* Template actions */}
          <View style={tc.templateActions}>
            <TouchableOpacity style={tc.templateActionBtn} onPress={onEditTemplate}>
              <Feather name="edit-2" size={12} color={colors.textMuted} />
              <Text style={tc.templateActionText}>Renommer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tc.templateActionBtn, tc.templateActionDanger]} onPress={onDeleteTemplate}>
              <Feather name="trash-2" size={12} color={colors.danger} />
              <Text style={[tc.templateActionText, { color: colors.danger }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const tc = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  numBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  numText: { fontSize: 14, fontWeight: '800' },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  goBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 18,
    minWidth: 52,
    alignItems: 'center',
  },
  goBtnText: { color: colors.accentText, fontSize: 14, fontWeight: '800' },

  expanded: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  exName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  exMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  exAction: { padding: 4 },

  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  addExText: { fontSize: 13, fontWeight: '600' },

  templateActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  templateActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  templateActionDanger: {
    backgroundColor: '#2a1515',
    borderColor: colors.danger + '40',
  },
  templateActionText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
});

// ── Main styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  screenHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  screenTitle: { color: colors.text, fontSize: 26, fontWeight: '900' },
  screenSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  tabScroll: { flexGrow: 0 },
  tabScrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  programTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.divider,
    backgroundColor: colors.surface1,
  },
  programTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  programTabTextActive: { color: colors.accentText, fontWeight: '800' },
  newProgramTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.accent + '60',
    backgroundColor: '#0f2318',
  },
  newProgramTabText: { color: colors.accent, fontSize: 13, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },

  programActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  programActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  programActionDanger: {
    backgroundColor: '#2a1515',
    borderColor: colors.danger + '40',
  },
  programActionText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  addSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent + '50',
    borderStyle: 'dashed',
    backgroundColor: '#0f2318',
  },
  addSessionBtnText: { color: colors.accent, fontSize: 14, fontWeight: '700' },

  emptyTemplates: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyTemplatesText: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },

  emptyPrograms: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyProgramsTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyProgramsSub: { color: colors.textMuted, fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },

  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnText: { color: colors.accentText, fontSize: 15, fontWeight: '700' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryCard: {
    width: '47%',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 6,
  },
  categoryEmoji: { fontSize: 24 },
  categoryName: { fontSize: 13, fontWeight: '700' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  backBtnText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  searchInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  exercisePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exercisePickerName: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  exercisePickerMeta: { color: colors.textMuted, fontSize: 12 },

  progressionRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 6 },
  progressionPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.divider,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  progressionPillActive: {
    borderColor: colors.accent,
    backgroundColor: '#0f2318',
  },
  progressionPillText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  progressionPillTextActive: { color: colors.accent },
  progressionDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
