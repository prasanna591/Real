import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { EydContainer, EydHeaderBar, EydScreen } from '@/components/eyd/screen';
import {
  EydButton,
  EydCard,
  EydChip,
  EydEmpty,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { PROFESSIONAL_CATEGORY_LABEL } from '@/lib/eyd/seed';
import { addToProjectTeam, logActivity, removeFromProjectTeam, useEyD } from '@/lib/eyd/store';
import type { Professional } from '@/lib/eyd/types';

export default function ProfessionalProfileScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, update } = useEyD();

  const professional: Professional | undefined = state.professionals.find((p) => p.id === id);
  const added = state.projectTeam.includes(id);

  const header = (
    <EydHeaderBar title="Professional" onBack={() => router.back()} right={<EydSyncPill />} />
  );

  if (!professional) {
    return (
      <EydScreen header={header}>
        <EydContainer>
          <EydEmpty icon="business-outline" title="Profile not found" body="This professional is not in the local catalogue." />
        </EydContainer>
      </EydScreen>
    );
  }

  const toggleTeam = () => {
    update((d) => {
      if (added) removeFromProjectTeam(d, professional.id);
      else addToProjectTeam(d, professional.id);
      logActivity(d, `${added ? 'Removed from team' : 'Added to project team'} — ${professional.name} (${PROFESSIONAL_CATEGORY_LABEL[professional.category]})`, 'team');
    });
  };

  const contact = () => {
    Alert.alert(
      `Contact ${professional.name}`,
      `${professional.profession} · ${professional.location}\n\nSample profile — the live marketplace lets you request contact details over chat. For now you can save this professional to your project team.`,
      [{ text: 'Done', style: 'cancel' }],
    );
  };

  const requestQuote = () => {
    Alert.alert(
      'Quote request',
      `In the live app, this would open a quotation request to ${professional.name} (${professional.pricing}). Quotations you receive land in the Quotations section for comparison.`,
      [{ text: 'Got it', style: 'cancel' }],
    );
  };

  const { name, profession, location, rating, verified, experienceYears, projectsCompleted, description, skills, services, pricing, projects, reviews, category } = professional;

  return (
    <EydScreen
      header={header}
      footer={
        <View style={styles.footer}>
          <EydButton label="Request quote" onPress={requestQuote} style={styles.footerBtn} />
          <EydButton label="Contact" variant="secondary" icon="chatbubble-ellipses-outline" onPress={contact} style={styles.footerBtn} />
          <EydButton
            label={added ? 'Added to project' : 'Add to project'}
            variant={added ? 'secondary' : 'primary'}
            icon={added ? 'checkmark' : 'add'}
            onPress={toggleTeam}
            style={styles.footerBtn}
          />
        </View>
      }>
      <EydContainer style={styles.stack}>
        <EydCard tone="blueSoft">
          <EydText variant="small" tone="secondary">
            Sample profile — generated data for this demo; not real, verified or shortlisted.
          </EydText>
        </EydCard>

        <EydCard style={styles.stack}>
          <View style={styles.headRow}>
            <View style={styles.headText}>
              <EydText variant="title">{name}</EydText>
              <EydText variant="body" tone="secondary">
                {profession} · {location}
              </EydText>
            </View>
            {verified ? <EydChip label="Verified" tone="success" /> : <EydChip label="Sample" tone="neutral" />}
          </View>

          <View style={styles.metaRow}>
            <EydChip label={PROFESSIONAL_CATEGORY_LABEL[category]} tone="blue" />
            <View style={styles.stars}>
              <Ionicons name="star" size={12} color="#F5A623" />
              <EydText variant="small">{rating.toFixed(1)}</EydText>
            </View>
            <EydText variant="small" tone="muted">
              {projectsCompleted} projects · {experienceYears} yrs
            </EydText>
          </View>

          <EydText variant="body">{description}</EydText>
        </EydCard>

        <EydSectionTitle title="Pricing (estimated)" />
        <EydCard style={styles.pricingCard}>
          <Ionicons name="cash-outline" size={18} color={t.blue} />
          <EydText variant="subheading">{pricing}</EydText>
        </EydCard>

        <EydSectionTitle title="Skills" />
        <View style={styles.chipWrap}>
          {skills.map((s) => (
            <EydChip key={s} label={s} tone="blue" />
          ))}
        </View>

        <EydSectionTitle title="Services" />
        <EydCard style={styles.stack}>
          {services.map((s, i) => (
            <View key={s} style={[styles.serviceRow, i < services.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={t.success} />
              <EydText variant="small" style={styles.serviceText}>
                {s}
              </EydText>
            </View>
          ))}
        </EydCard>

        <EydSectionTitle title="Recent projects" />
        {projects.map((pj) => (
          <EydCard key={`${pj.name}-${pj.year}`} style={styles.projectCard}>
            <EydText variant="subheading" numberOfLines={1}>
              {pj.name}
            </EydText>
            <EydText variant="small" tone="secondary">
              {pj.year} · {pj.location}
            </EydText>
          </EydCard>
        ))}

        <EydSectionTitle title={`Reviews (${reviews.length})`} />
        <EydCard style={styles.stack}>
          {reviews.map((r) => (
            <View key={r.author} style={styles.review}>
              <View style={styles.reviewHead}>
                <EydText variant="small" style={styles.reviewAuthor}>
                  {r.author}
                </EydText>
                <View style={styles.stars}>
                  <Ionicons name="star" size={12} color="#F5A623" />
                  <EydText variant="small">{r.rating.toFixed(1)}</EydText>
                </View>
              </View>
              <EydText variant="small" tone="secondary">
                {r.text}
              </EydText>
            </View>
          ))}
        </EydCard>
      </EydContainer>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  pricingCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headText: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  serviceText: { flex: 1 },
  projectCard: { gap: 2 },
  review: { gap: 4 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewAuthor: { fontWeight: '700', flex: 1 },
  footer: { flexDirection: 'row', gap: EyDSpacing.md, alignItems: 'center' },
  footerBtn: { flex: 1 },
});