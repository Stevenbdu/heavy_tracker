import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from '@/components/charts';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, BodyMetric } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';
import { confirmAlert, infoAlert } from '@/lib/alert';

// ── Metric definitions ────────────────────────────────────────────
type MetricKey = 'weight' | 'height' | 'chest' | 'waist' | 'hips' | 'armR' | 'armL' | 'thighR' | 'thighL';

const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: 'weight',  label: 'Poids',      unit: 'kg', color: '#00E87A' },
  { key: 'height',  label: 'Taille',     unit: 'cm', color: '#3b82f6' },
  { key: 'chest',   label: 'Poitrine',   unit: 'cm', color: '#ef4444' },
  { key: 'waist',   label: 'Abdomen',    unit: 'cm', color: '#f97316' },
  { key: 'hips',    label: 'Hanches',    unit: 'cm', color: '#a855f7' },
  { key: 'armR',    label: 'Bras D.',    unit: 'cm', color: '#22c55e' },
  { key: 'armL',    label: 'Bras G.',    unit: 'cm', color: '#16a34a' },
  { key: 'thighR',  label: 'Cuisse D.',  unit: 'cm', color: '#eab308' },
  { key: 'thighL',  label: 'Cuisse G.',  unit: 'cm', color: '#ca8a04' },
];

// ── Main screen ───────────────────────────────────────────────────
export default function BodyScreen() {
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weight');
  const [form, setForm] = useState<Partial<Record<MetricKey, string>>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.metrics.list();
      setMetrics(data);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setForm({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload: Partial<Record<MetricKey, number>> = {};
    for (const m of METRICS) {
      const v = form[m.key];
      if (v && v.trim() !== '') payload[m.key] = parseFloat(v.replace(',', '.'));
    }
    if (Object.keys(payload).length === 0) {
      infoAlert('Vide', 'Remplis au moins une mesure');
      return;
    }
    setSaving(true);
    try {
      await api.metrics.create(payload);
      setModalOpen(false);
      load();
    } catch {
      infoAlert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) =>
    confirmAlert('Supprimer cette entrée ?', 'Irréversible.', async () => {
      try { await api.metrics.delete(id); load(); }
      catch { infoAlert('Erreur', 'Impossible de supprimer'); }
    }, 'Supprimer');

  // Latest value per metric (first entry = most recent)
  const latest = useMemo(() => {
    const m: Partial<Record<MetricKey, { value: number; delta: number | null }>> = {};
    for (const metric of METRICS) {
      const withVal = metrics.filter((e) => e[metric.key] != null);
      if (withVal.length === 0) continue;
      const value = withVal[0][metric.key]!;
      const prev = withVal[1]?.[metric.key] ?? null;
      m[metric.key] = { value, delta: prev != null ? Math.round((value - prev) * 10) / 10 : null };
    }
    return m;
  }, [metrics]);

  // Chart data for selected metric (last 12 entries, chronological)
  const chartData = useMemo(() => {
    return metrics
      .filter((e) => e[selectedMetric] != null)
      .slice(0, 12)
      .reverse()
      .map((e) => ({
        label: (() => { const d = new Date(e.date); return `${d.getDate()}/${d.getMonth() + 1}`; })(),
        value: e[selectedMetric]!,
      }));
  }, [metrics, selectedMetric]);

  const availableMetrics = useMemo(
    () => METRICS.filter((m) => metrics.some((e) => e[m.key] != null)),
    [metrics]
  );

  const selectedDef = METRICS.find((m) => m.key === selectedMetric)!;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Corps</Text>
          <Text style={styles.screenSub}>Suivi des mensurations</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openModal} activeOpacity={0.8}>
          <Feather name="plus" size={20} color={colors.accentText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
      >
        {metrics.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📏</Text>
            <Text style={styles.emptyTitle}>Aucune mensuration</Text>
            <Text style={styles.emptySub}>Ajoute ta première entrée pour commencer le suivi</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openModal} activeOpacity={0.8}>
              <Feather name="plus" size={16} color={colors.accentText} />
              <Text style={styles.emptyBtnText}>Ajouter une mensuration</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Latest metrics grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DERNIÈRES MESURES</Text>
              <View style={styles.metricsGrid}>
                {METRICS.filter((m) => latest[m.key] != null).map((m) => {
                  const entry = latest[m.key]!;
                  return (
                    <View key={m.key} style={[styles.metricCard, { borderColor: m.color + '40' }]}>
                      <Text style={styles.metricCardLabel}>{m.label}</Text>
                      <Text style={[styles.metricCardValue, { color: m.color }]}>
                        {entry.value} <Text style={styles.metricCardUnit}>{m.unit}</Text>
                      </Text>
                      {entry.delta != null && entry.delta !== 0 && (
                        <Text style={[styles.metricCardDelta, { color: entry.delta < 0 ? colors.accent : colors.danger }]}>
                          {entry.delta > 0 ? '+' : ''}{entry.delta} {m.unit}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Evolution chart */}
            {availableMetrics.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ÉVOLUTION</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.sm }}>
                    {availableMetrics.map((m) => (
                      <TouchableOpacity
                        key={m.key}
                        style={[styles.chip, selectedMetric === m.key && { backgroundColor: m.color + '22', borderColor: m.color }]}
                        onPress={() => setSelectedMetric(m.key)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, selectedMetric === m.key && { color: m.color }]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <View style={styles.chartCard}>
                  <View style={styles.chartCardHeader}>
                    <Text style={styles.chartCardTitle}>{selectedDef.label}</Text>
                    {latest[selectedMetric] && (
                      <Text style={[styles.chartCardCurrent, { color: selectedDef.color }]}>
                        {latest[selectedMetric]!.value} {selectedDef.unit}
                      </Text>
                    )}
                  </View>
                  <LineChart data={chartData} color={selectedDef.color} unit={` ${selectedDef.unit}`} gradientId="metric_chart" />
                  {chartData.length >= 2 && (() => {
                    const diff = chartData[chartData.length - 1].value - chartData[0].value;
                    if (Math.abs(diff) < 0.1) return null;
                    const isGood = selectedMetric === 'weight' || selectedMetric === 'waist' ? diff < 0 : diff > 0;
                    return (
                      <Text style={[styles.chartDelta, { color: isGood ? colors.accent : colors.danger }]}>
                        {diff > 0 ? '↑' : '↓'} {Math.abs(Math.round(diff * 10) / 10)} {selectedDef.unit} depuis le début
                      </Text>
                    );
                  })()}
                </View>
              </View>
            )}

            {/* History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HISTORIQUE</Text>
              {metrics.map((entry) => (
                <View key={entry.id} style={styles.historyCard}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>
                      {new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <View style={styles.historyValues}>
                      {METRICS.filter((m) => entry[m.key] != null).map((m) => (
                        <Text key={m.key} style={[styles.historyValue, { color: m.color }]}>
                          {m.label} {entry[m.key]}{m.unit}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(entry.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={16} color={colors.danger + '80'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Add modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setModalOpen(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Nouvelle mensuration</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Corps */}
                <Text style={styles.formGroupLabel}>CORPS</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>POIDS (kg)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="75.5" placeholderTextColor={colors.textMuted} value={form.weight ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>TAILLE (cm)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="178" placeholderTextColor={colors.textMuted} value={form.height ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, height: v }))} />
                  </View>
                </View>

                {/* Buste */}
                <Text style={styles.formGroupLabel}>BUSTE</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>POITRINE (cm)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="95" placeholderTextColor={colors.textMuted} value={form.chest ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, chest: v }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>ABDOMEN (cm)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="82" placeholderTextColor={colors.textMuted} value={form.waist ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, waist: v }))} />
                  </View>
                </View>

                {/* Bas */}
                <Text style={styles.formGroupLabel}>BAS DU CORPS</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>HANCHES (cm)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="95" placeholderTextColor={colors.textMuted} value={form.hips ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, hips: v }))} />
                  </View>
                </View>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>CUISSE D. (cm)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="58" placeholderTextColor={colors.textMuted} value={form.thighR ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, thighR: v }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>CUISSE G. (cm)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="58" placeholderTextColor={colors.textMuted} value={form.thighL ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, thighL: v }))} />
                  </View>
                </View>

                {/* Bras */}
                <Text style={styles.formGroupLabel}>BRAS</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>BRAS D. (cm)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="36" placeholderTextColor={colors.textMuted} value={form.armR ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, armR: v }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>BRAS G. (cm)</Text>
                    <TextInput style={styles.fieldInput} keyboardType="decimal-pad" placeholder="36" placeholderTextColor={colors.textMuted} value={form.armL ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, armL: v }))} />
                  </View>
                </View>
                <View style={{ height: spacing.md }} />
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  screenTitle: { color: colors.text, fontSize: 26, fontWeight: '900' },
  screenSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  emptyBtnText: { color: colors.accentText, fontSize: 14, fontWeight: '700' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCard: {
    width: '47%',
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  metricCardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  metricCardValue: { fontSize: 22, fontWeight: '900' },
  metricCardUnit: { fontSize: 14, fontWeight: '600' },
  metricCardDelta: { fontSize: 12, fontWeight: '700' },

  chip: {
    backgroundColor: colors.surface2,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  chartCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  chartCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartCardTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  chartCardCurrent: { fontSize: 15, fontWeight: '800' },
  chartDelta: { fontSize: 12, fontWeight: '700' },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
  },
  historyLeft: { flex: 1, gap: 4 },
  historyDate: { color: colors.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  historyValues: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  historyValue: { fontSize: 11, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
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
  modalHandle: { width: 40, height: 4, backgroundColor: colors.divider, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.xs },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },

  formGroupLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4, marginTop: spacing.xs },
  formRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  fieldLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  fieldInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
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
});
