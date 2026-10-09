import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EydContainer, EydScreen } from '@/components/eyd/screen';
import { EydButton, EydCard, EydChip, EydProgress, EydRow, EydSectionTitle, EydSyncPill, EydText } from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatINR, formatINRShort } from '@/lib/eyd/format';
import { useEyD, logActivity } from '@/lib/eyd/store';
import { DESIGN_STYLE_LABELS, HOME_TYPE_LABELS, SCOPE_LABELS } from '@/lib/eyd/seed';
import type { BuildScope, DesignStyle, HomeType } from '@/lib/eyd/types';

const STEPS = ['Building type', 'Requirements', 'Budget', 'Style'];

const SCOPES: { value: BuildScope; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { value: 'new_home', icon: 'home-outline', hint: 'Build a brand new house on your plot' },
  { value: 'renovation', icon: 'hammer-outline', hint: 'Rework an existing home' },
  { value: 'extension', icon: 'expand-outline', hint: 'Add floors, rooms or wings' },
];

const HOME_TYPES: HomeType[] = ['villa', 'independent_house', 'duplex', 'apartment', 'plot_house'];
const STYLES: DesignStyle[] = ['modern', 'traditional', 'minimal', 'luxury', 'other'];
const CONTINGENCY = [0, 5, 10, 15];

export default function HomePlanner() {
  const t = useEyDTheme();
  const router = useRouter();
  const { state, update } = useEyD();
  const existing = state.profile;

  const [step, setStep] = useState(0);
  const [scope, setScope] = useState<BuildScope>(existing?.scope ?? 'new_home');
  const [plotSize, setPlotSize] = useState(existing?.plotSizeSqft?.toString() ?? '');
  const [floors, setFloors] = useState(existing?.floors ?? 1);
  const [bedrooms, setBedrooms] = useState(existing?.bedrooms ?? 2);
  const [bathrooms, setBathrooms] = useState(existing?.bathrooms ?? 2);
  const [parking, setParking] = useState(existing?.parking ?? 1);
  const [homeType, setHomeType] = useState<HomeType | null>(existing?.homeType ?? 'villa');
  const [budget, setBudget] = useState(existing ? String(existing.budgetTotal) : '');
  const [rangeMin, setRangeMin] = useState(existing?.budgetRangeMin?.toString() ?? '');
  const [rangeMax, setRangeMax] = useState(existing?.budgetRangeMax?.toString() ?? '');
  const [contingency, setContingency] = useState(existing?.contingencyPct ?? 5);
  const [style, setStyle] = useState<DesignStyle | null>(existing?.style ?? 'modern');
  const [styleNote, setStyleNote] = useState(existing?.styleNote ?? '');
  const [error, setError] = useState<string | null>(null);

  const budgetValue = Number(budget.replace(/[^0-9]/g, ''));
  const canContinue = useMemo(() => {
    if (step === 1) return bedrooms >= 1 && bathrooms >= 1 && floors >= 1;
    if (step === 2) return budgetValue > 0;
    return true;
  }, [step, bedrooms, bathrooms, floors, budgetValue]);

  const next = () => {
    if (!canContinue) {
      setError(step === 2 ? 'Enter an estimated budget to continue.' : 'Check your requirements to continue.');
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const generate = () => {
    const now = new Date().toISOString();
    const plot = Number(plotSize.replace(/[^0-9]/g, ''));
    update((draft) => {
      draft.profile = {
        scope,
        plotSizeSqft: plot > 0 ? plot : null,
        floors,
        bedrooms,
        bathrooms,
        parking,
        homeType,
        budgetTotal: budgetValue,
        budgetRangeMin: rangeMin ? Number(rangeMin.replace(/[^0-9]/g, '')) : null,
        budgetRangeMax: rangeMax ? Number(rangeMax.replace(/[^0-9]/g, '')) : null,
        contingencyPct: contingency,
        style,
        styleNote: styleNote.trim(),
        createdAt: draft.profile?.createdAt ?? now,
        updatedAt: now,
      };
      draft.project = {
        ...draft.project,
        scope,
        homeType,
        budgetTotal: budgetValue,
        updatedAt: now,
      };
      logActivity(draft, existing ? 'Home plan updated from planner' : 'Home plan generated from planner', 'plan');
    });
    router.push('/build');
  };

  const requirements =
    `${bedrooms} BHK · ${bathrooms} bath · ${floors} floor${floors > 1 ? 's' : ''}` +
    (parking > 0 ? ` · ${parking} parking` : '');

  const header = (
    <View style={styles.headerRow}>
      <View style={styles.headerText}>
        <EydText variant="eyebrow" tone="blue">
          Home planner
        </EydText>
        <EydText variant="heading">Step {step + 1} of {STEPS.length} · {STEPS[step]}</EydText>
      </View>
      <Pressable
        onPress={() => router.push('/build')}
        accessibilityRole="button"
        accessibilityLabel="Open project dashboard"
        style={({ pressed }) => [styles.headerAction, { backgroundColor: t.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="grid-outline" size={18} color={t.text} />
      </Pressable>
      <EydSyncPill />
    </View>
  );

  return (
    <EydScreen header={header} underTabs footer={
      <View style={styles.footerRow}>
        {step > 0 ? <EydButton label="Back" onPress={back} variant="secondary" style={styles.footerGhost} /> : null}
        {step < STEPS.length - 1 ? (
          <EydButton label="Continue" onPress={next} icon="arrow-forward" style={styles.footerMain} />
        ) : (
          <EydButton label="Generate my home plan" onPress={generate} icon="sparkles-outline" style={styles.footerMain} />
        )}
      </View>
    }>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.stack}>
        <EydContainer style={styles.stack}>
          <EydProgress value={((step + 1) / STEPS.length) * 100} height={6} />

          {error ? (
            <EydCard tone="warmSoft">
              <EydText variant="small" tone="warm">
                {error}
              </EydText>
            </EydCard>
          ) : null}

          {step === 0 ? (
            <View style={styles.stack}>
              <EydSectionTitle title="What are you building?" caption="This sets the scope of your project." />
              {SCOPES.map((option) => {
                const selected = scope === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setScope(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}>
                    <EydCard style={[styles.choice, selected && { borderColor: t.blue, borderWidth: 1.5 }]}>
                      <View style={styles.choiceRow}>
                        <Ionicons name={option.icon} size={22} color={selected ? t.blue : t.textSecondary} />
                        <View style={styles.choiceText}>
                          <EydText variant="subheading">{SCOPE_LABELS[option.value]}</EydText>
                          <EydText variant="small" tone="secondary">
                            {option.hint}
                          </EydText>
                        </View>
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={selected ? t.blue : t.textMuted}
                        />
                      </View>
                    </EydCard>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.stack}>
              <EydSectionTitle title="Basic requirements" caption="Keep it approximate — you can refine later." />

              <EydCard style={styles.stack}>
                <FieldLabel label="Plot size (sq.ft)" />
                <TextInput
                  value={plotSize}
                  onChangeText={setPlotSize}
                  keyboardType="number-pad"
                  placeholder="e.g. 2400"
                  placeholderTextColor={t.textMuted}
                  style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
                />
                <Stepper label="Number of floors" value={floors} onChange={setFloors} min={1} max={10} />
                <Stepper label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={1} max={12} />
                <Stepper label="Bathrooms" value={bathrooms} onChange={setBathrooms} min={1} max={12} />
                <Stepper label="Parking" value={parking} onChange={setParking} min={0} max={6} />
              </EydCard>

              <EydSectionTitle title="Home type" />
              <View style={styles.chipWrap}>
                {HOME_TYPES.map((type) => (
                  <EydChip
                    key={type}
                    label={HOME_TYPE_LABELS[type]}
                    tone="blue"
                    selected={homeType === type}
                    onPress={() => setHomeType(type)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stack}>
              <EydSectionTitle title="Budget" caption="Everything you plan to spend on this home." />

              <EydCard style={styles.stack}>
                <FieldLabel label="Estimated budget (₹)" />
                <TextInput
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="number-pad"
                  placeholder="e.g. 2000000"
                  placeholderTextColor={t.textMuted}
                  style={[styles.input, styles.inputBig, { backgroundColor: t.surfaceAlt, color: t.text }]}
                />
                {budgetValue > 0 ? (
                  <EydText variant="small" tone="blue">
                    {formatINR(budgetValue)} · {formatINRShort(budgetValue)}
                  </EydText>
                ) : null}
              </EydCard>

              <EydCard style={styles.rowGap}>
                <View style={styles.halfField}>
                  <FieldLabel label="Preferred range — from (₹)" />
                  <TextInput
                    value={rangeMin}
                    onChangeText={setRangeMin}
                    keyboardType="number-pad"
                    placeholder="1800000"
                    placeholderTextColor={t.textMuted}
                    style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
                  />
                </View>
                <View style={styles.halfField}>
                  <FieldLabel label="Preferred range — to (₹)" />
                  <TextInput
                    value={rangeMax}
                    onChangeText={setRangeMax}
                    keyboardType="number-pad"
                    placeholder="2200000"
                    placeholderTextColor={t.textMuted}
                    style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
                  />
                </View>
              </EydCard>

              <EydSectionTitle title="Contingency" caption="Buffer kept aside for surprises." />
              <View style={styles.chipWrap}>
                {CONTINGENCY.map((pct) => (
                  <EydChip
                    key={pct}
                    label={pct === 0 ? 'None' : `${pct}%`}
                    tone="warm"
                    selected={contingency === pct}
                    onPress={() => setContingency(pct)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stack}>
              <EydSectionTitle title="Preferences" caption="The look and feel you want for your home." />
              <View style={styles.chipWrap}>
                {STYLES.map((option) => (
                  <EydChip
                    key={option}
                    label={DESIGN_STYLE_LABELS[option]}
                    tone="blue"
                    selected={style === option}
                    onPress={() => setStyle(option)}
                  />
                ))}
              </View>

              <EydCard style={styles.stack}>
                <FieldLabel label="Notes for your architect (optional)" />
                <TextInput
                  value={styleNote}
                  onChangeText={setStyleNote}
                  multiline
                  placeholder="e.g. Warm minimal interiors, lots of natural light"
                  placeholderTextColor={t.textMuted}
                  style={[styles.input, styles.inputMultiline, { backgroundColor: t.surfaceAlt, color: t.text }]}
                />
              </EydCard>

              <EydSectionTitle title="Home profile" caption="Review before generating." />
              <EydCard>
                <EydRow label="Construction scope" value={SCOPE_LABELS[scope]} />
                <EydRow label="Estimated budget" value={budgetValue > 0 ? formatINR(budgetValue) : 'Not set'} />
                <EydRow label="Requirements" value={requirements} />
                <EydRow label="Plot size" value={plotSize ? `${plotSize} sq.ft` : 'Not set'} />
                <EydRow label="Home type" value={homeType ? HOME_TYPE_LABELS[homeType] : 'Not set'} />
                <EydRow label="Preferred style" value={style ? DESIGN_STYLE_LABELS[style] : 'Not set'} tone={style ? 'text' : 'muted'} />
                <EydRow label="Contingency" value={contingency === 0 ? 'None' : `${contingency}%`} />
              </EydCard>

              <EydCard tone="blueSoft">
                <EydText variant="small" tone="secondary">
                  Your plan is stored on this device and works offline. You can edit it any time from the planner.
                </EydText>
              </EydCard>
            </View>
          ) : null}
        </EydContainer>
      </KeyboardAvoidingView>
    </EydScreen>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <EydText variant="small" tone="secondary" style={styles.fieldLabel}>
      {label}
    </EydText>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
}) {
  const t = useEyDTheme();
  const press = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.stepperRow}>
      <EydText variant="small" tone="secondary" style={styles.stepperLabel}>
        {label}
      </EydText>
      <View style={styles.stepperControls}>
        <Pressable onPress={() => press(-1)} style={[styles.stepButton, { backgroundColor: t.surfaceAlt }]} accessibilityLabel={`Decrease ${label}`}>
          <Ionicons name="remove" size={18} color={t.text} />
        </Pressable>
        <EydText variant="subheading" style={styles.stepValue}>
          {value}
        </EydText>
        <Pressable onPress={() => press(1)} style={[styles.stepButton, { backgroundColor: t.surfaceAlt }]} accessibilityLabel={`Increase ${label}`}>
          <Ionicons name="add" size={18} color={t.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  headerAction: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footerRow: { flexDirection: 'row', gap: EyDSpacing.md },
  footerGhost: { flex: 1 },
  footerMain: { flex: 2 },
  choice: { borderWidth: 1 },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceText: { flex: 1, gap: 2 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Fonts.sans,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  inputBig: { height: 56, fontSize: 22, fontWeight: '700' },
  inputMultiline: { minHeight: 92, paddingTop: 12, textAlignVertical: 'top', fontSize: 15 },
  fieldLabel: { fontWeight: '700' },
  rowGap: { flexDirection: 'row', gap: EyDSpacing.md, flexWrap: 'wrap' },
  halfField: { flexGrow: 1, flexBasis: 160, gap: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  stepperLabel: { flex: 1 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 24, textAlign: 'center' },
});
