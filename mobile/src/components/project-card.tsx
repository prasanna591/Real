import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Entrance, PressableScale } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PROPERTY_TYPE_LABELS, formatDate, formatPrice } from '@/lib/format';
import type { Project } from '@/types/api';

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Entrance index={index}>
      <PressableScale
        onPress={() => router.push(`/project/${project.id}`)}
        accessibilityLabel={`Open ${project.name}`}
        style={[styles.card, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.headerRow}>
          <LinearGradient
            colors={[Gradients.ember[0], Gradients.ember[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chip}>
            <ThemedText type="smallBold" style={styles.chipText}>
              {PROPERTY_TYPE_LABELS[project.property_type]}
            </ThemedText>
          </LinearGradient>
          <View style={styles.priceBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              Starting
            </ThemedText>
            <ThemedText type="smallBold">{formatPrice(project.starting_price)}</ThemedText>
          </View>
        </View>

        <ThemedText type="subtitle" style={styles.name}>
          {project.name}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {[project.locality, project.city].filter(Boolean).join(', ')}
        </ThemedText>

        <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Possession {formatDate(project.possession_date)}
          </ThemedText>
          <ThemedText type="linkPrimary">Explore →</ThemedText>
        </View>
      </PressableScale>
    </Entrance>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(24,27,35,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  chipText: {
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  name: {
    fontSize: 26,
    lineHeight: 32,
    marginTop: Spacing.two,
    letterSpacing: -0.4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
  },
});
