import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calculateEMI, formatEMIPrice } from '@/lib/emi';

export function EMICalculator({ basePrice }: { basePrice?: string | number | null }) {
  const theme = useTheme();
  const initial = basePrice ? Math.round(Number(basePrice) * 0.8) : 5000000;

  const [principal, setPrincipal] = useState(initial);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [expanded, setExpanded] = useState(false);

  const result = useMemo(() => calculateEMI(principal, rate, tenure), [principal, rate, tenure]);

  const presets = [
    { label: '10 yr', value: 10 },
    { label: '15 yr', value: 15 },
    { label: '20 yr', value: 20 },
    { label: '30 yr', value: 30 },
  ];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded(!expanded)}
        style={styles.toggle}>
        <Ionicons
          name="calculator-outline"
          size={18}
          color={theme.primary}
        />
        <ThemedText type="smallBold" style={{ color: theme.primary, flex: 1 }}>
          EMI Calculator
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>

      {expanded && (
        <ThemedView type="backgroundElement" style={styles.container}>
          <View style={styles.inputGroup}>
            <ThemedText type="small" themeColor="textSecondary">
              Loan amount
            </ThemedText>
            <View style={[styles.inputRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <ThemedText type="smallBold">₹</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                keyboardType="numeric"
                value={principal.toLocaleString('en-IN')}
                onChangeText={(t) => {
                  const num = Number(t.replace(/[^0-9]/g, ''));
                  if (!isNaN(num) && num > 0) setPrincipal(num);
                }}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" themeColor="textSecondary">
              Interest rate ({rate}% p.a.)
            </ThemedText>
            <View style={styles.sliderTrack}>
              <View style={styles.sliderContainer}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRate((r) => Math.max(3, r - 0.5))}
                  style={[styles.sliderBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <ThemedText type="smallBold">−</ThemedText>
                </Pressable>
                <View style={styles.sliderFillContainer}>
                  <View style={[styles.sliderBg, { backgroundColor: theme.border }]} />
                  <View style={[styles.sliderFill, { width: `${((rate - 3) / 17) * 100}%`, backgroundColor: theme.primary }]} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRate((r) => Math.min(20, r + 0.5))}
                  style={[styles.sliderBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <ThemedText type="smallBold">+</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" themeColor="textSecondary">
              Tenure
            </ThemedText>
            <View style={styles.tenureRow}>
              {presets.map((p) => (
                <Pressable
                  key={p.value}
                  accessibilityRole="button"
                  onPress={() => setTenure(p.value)}
                  style={[
                    styles.tenureChip,
                    {
                      backgroundColor:
                        tenure === p.value ? theme.text : theme.background,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: tenure === p.value ? theme.background : theme.text }}>
                    {p.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <ThemedView
            type="background"
            style={[styles.resultCard, { borderColor: theme.border }]}>
            <View style={styles.resultRow}>
              <View style={styles.resultItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  Monthly EMI
                </ThemedText>
                <ThemedText type="subtitle" style={{ color: theme.primary }}>
                  {formatEMIPrice(result.monthlyEmi)}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.resultRow, { marginTop: Spacing.two }]}>
              <View style={styles.resultItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  Total interest
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatEMIPrice(result.totalInterest)}
                </ThemedText>
              </View>
              <View style={styles.resultItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  Total amount
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatEMIPrice(result.totalAmount)}
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            *Indicative only. Actual EMI depends on lender terms and credit profile.
          </ThemedText>
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'DM Sans',
  },
  sliderTrack: {
    paddingVertical: Spacing.one,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderFillContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 3,
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
  },
  tenureRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tenureChip: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
  },
  resultRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  resultItem: {
    flex: 1,
    gap: Spacing.half,
  },
  disclaimer: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
