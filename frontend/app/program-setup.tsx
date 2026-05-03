import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';
import { infoAlert } from '@/lib/alert';
import {
  PROGRAM_DEFS,
  RM_EXERCISES,
  ProgramType,
  RMKey,
  epley,
  applyRMs,
} from '@/lib/programTemplates';

type Step = 'type' | 'rm' | 'preview';

type RMInput = { weight: string; reps: string };

export default function ProgramSetupScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<ProgramType | null>(null);
  const [rmInputs, setRmInputs] = useState<Partial<Record<RMKey, RMInput>>>({});
  const [programName, setProgramName] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedDef = useMemo(
    () => PROGRAM_DEFS.find((d) => d.id === selectedType) ?? null,
    [selectedType]
  );

  const computedRMs = useMemo<Partial<Record<RMKey, number>>>(() => {
    const result: Partial<Record<RMKey, number>> = {};
    for (const [key, inp] of Object.entries(rmInputs) as [RMKey, RMInput][]) {
      const w = parseFloat(inp.weight);
      const r = parseInt(inp.reps);
      if (w > 0 && r > 0) result[key] = epley(w, r);
    }
    return result;
  }, [rmInputs]);

  const finalTemplates = useMemo(() => {
    if (!selectedDef) return [];
    return applyRMs(selectedDef.templates, computedRMs);
  }, [selectedDef, computedRMs]);

  const setRM = (key: RMKey, field: 'weight' | 'reps', value: string) => {
    setRmInputs((prev) => ({
      ...prev,
      [key]: { weight: '', reps: '', ...prev[key], [field]: value },
    }));
  };

  const handleSelectType = (type: ProgramType) => {
    const def = PROGRAM_DEFS.find((d) => d.id === type)!;
    setSelectedType(type);
    setProgramName(def.label);
    setStep('rm');
  };

  const handleCreate = async () => {
    if (!selectedDef || !programName.trim()) return;
    setCreating(true);
    try {
      const program = await api.programs.create({
        name: programName.trim(),
        description: selectedDef.description,
      });

      for (let tIdx = 0; tIdx < finalTemplates.length; tIdx++) {
        const tDef = finalTemplates[tIdx];
        const template = await api.templates.create(program.id, {
          name: tDef.name,
          order: tIdx,
        });
        for (let eIdx = 0; eIdx < tDef.exercises.length; eIdx++) {
          const ex = tDef.exercises[eIdx];
          await api.exercises.create(template.id, {
            name: ex.name,
            targetSets: ex.sets,
            targetReps: ex.reps,
            targetWeight: ex.weight,
            maxReps: ex.maxReps,
            weightIncrement: ex.weightIncrement,
            progressionType: ex.progressionType,
            order: eIdx,
          });
        }
      }

      await api.programs.activate(program.id);
      router.replace('/(tabs)/programs');
    } catch {
      infoAlert('Erreur', 'Impossible de créer le programme');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 'type') router.back();
              else if (step === 'rm') setStep('type');
              else setStep('rm');
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>
              {step === 'type' ? 'Choisir un programme' : step === 'rm' ? 'Tes niveaux de force' : 'Aperçu'}
            </Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        {/* Step indicator */}
        <View style={s.stepRow}>
          {(['type', 'rm', 'preview'] as Step[]).map((st, i) => (
            <View key={st} style={[s.stepDot, step === st && s.stepDotActive]} />
          ))}
        </View>

        {/* ── Step 1: Type selection ── */}
        {step === 'type' && (
          <ScrollView contentContainerStyle={s.content}>
            <Text style={s.subtitle}>Sélectionne un modèle de programme</Text>
            {PROGRAM_DEFS.map((def) => (
              <TouchableOpacity
                key={def.id}
                style={s.typeCard}
                onPress={() => handleSelectType(def.id)}
                activeOpacity={0.82}
              >
                <View style={s.typeCardTop}>
                  <Text style={s.typeIcon}>{def.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.typeLabel}>{def.label}</Text>
                    <Text style={s.typeFrequency}>{def.frequency}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </View>
                <Text style={s.typeDesc}>{def.description}</Text>
                <View style={s.typeTemplates}>
                  {def.templates.map((t, i) => (
                    <View key={i} style={s.typeTemplatePill}>
                      <Text style={s.typeTemplatePillText}>{t.name}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Step 2: RM questionnaire ── */}
        {step === 'rm' && (
          <ScrollView contentContainerStyle={s.content}>
            <Text style={s.subtitle}>
              Entre ton meilleur set pour chaque exercice de base. On calcule ton 1RM automatiquement.
            </Text>
            {RM_EXERCISES.map(({ key, label, hint }) => {
              const inp = rmInputs[key];
              const w = parseFloat(inp?.weight ?? '');
              const r = parseInt(inp?.reps ?? '');
              const rm1 = w > 0 && r > 0 ? epley(w, r) : null;

              return (
                <View key={key} style={s.rmCard}>
                  <View style={s.rmCardHeader}>
                    <Text style={s.rmLabel}>{label}</Text>
                    {rm1 !== null && (
                      <View style={s.rmBadge}>
                        <Text style={s.rmBadgeText}>1RM ≈ {rm1} kg</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.rmHint}>{hint}</Text>
                  <View style={s.rmInputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rmInputLabel}>POIDS (kg)</Text>
                      <TextInput
                        style={s.rmInput}
                        keyboardType="decimal-pad"
                        placeholder="ex: 80"
                        placeholderTextColor={colors.textMuted}
                        value={inp?.weight ?? ''}
                        onChangeText={(v) => setRM(key, 'weight', v)}
                      />
                    </View>
                    <Text style={s.rmTimes}>×</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rmInputLabel}>REPS</Text>
                      <TextInput
                        style={s.rmInput}
                        keyboardType="number-pad"
                        placeholder="ex: 5"
                        placeholderTextColor={colors.textMuted}
                        value={inp?.reps ?? ''}
                        onChangeText={(v) => setRM(key, 'reps', v)}
                      />
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => setStep('preview')}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Continuer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.skipBtn}
              onPress={() => { setRmInputs({}); setStep('preview'); }}
              activeOpacity={0.7}
            >
              <Text style={s.skipBtnText}>Passer cette étape</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 'preview' && selectedDef && (
          <ScrollView contentContainerStyle={s.content}>
            <Text style={s.subtitle}>Vérifie et nomme ton programme</Text>

            <View style={s.nameBlock}>
              <Text style={s.fieldLabel}>NOM DU PROGRAMME</Text>
              <TextInput
                style={s.nameInput}
                value={programName}
                onChangeText={setProgramName}
                placeholder="Ex : Mon PPL"
                placeholderTextColor={colors.textMuted}
                autoFocus={false}
              />
            </View>

            {finalTemplates.map((t, tIdx) => (
              <View key={tIdx} style={s.previewTemplate}>
                <Text style={s.previewTemplateName}>{t.name}</Text>
                {t.exercises.map((ex, eIdx) => (
                  <View key={eIdx} style={s.previewExRow}>
                    <View style={s.previewExDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.previewExName}>{ex.name}</Text>
                    </View>
                    <Text style={s.previewExMeta}>
                      {ex.sets}×{ex.reps}{ex.weight > 0 ? ` · ${ex.weight}kg` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            <TouchableOpacity
              style={[s.primaryBtn, (creating || !programName.trim()) && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={creating || !programName.trim()}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color={colors.accentText} />
              ) : (
                <Text style={s.primaryBtnText}>Créer le programme</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },

  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  stepDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
  },
  stepDotActive: { backgroundColor: colors.accent },

  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  // Type cards
  typeCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.sm,
  },
  typeCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeIcon: { fontSize: 28 },
  typeLabel: { color: colors.text, fontSize: 17, fontWeight: '800' },
  typeFrequency: { color: colors.accent, fontSize: 12, fontWeight: '600', marginTop: 1 },
  typeDesc: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  typeTemplates: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeTemplatePill: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  typeTemplatePillText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  // RM cards
  rmCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rmCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rmLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rmBadge: {
    backgroundColor: colors.accent + '22',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.accent + '55',
  },
  rmBadgeText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  rmHint: { color: colors.textMuted, fontSize: 12 },
  rmInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  rmInputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  rmInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  rmTimes: { color: colors.textMuted, fontSize: 18, fontWeight: '300', marginBottom: 12 },

  // Preview
  nameBlock: { gap: 6 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  nameInput: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent + '60',
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  previewTemplate: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: 6,
  },
  previewTemplateName: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  previewExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  previewExDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.divider,
  },
  previewExName: { color: colors.text, fontSize: 13 },
  previewExMeta: { color: colors.textMuted, fontSize: 12 },

  // Buttons
  primaryBtn: {
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
  primaryBtnText: { color: colors.accentText, fontSize: 15, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  skipBtnText: { color: colors.textMuted, fontSize: 14 },
});
