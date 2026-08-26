import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createProject } from '@/services/builder';

const PROPERTY_TYPES = [
  { value: 'luxury_apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'premium_residence', label: 'Premium' },
  { value: 'waterfront', label: 'Waterfront' },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NewProjectScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [propertyType, setPropertyType] = useState('luxury_apartment');
  const [startingPrice, setStartingPrice] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveSlug = slug || slugify(name);

  const handleSubmit = async () => {
    if (!name.trim() || !city.trim()) {
      setError('Project name and city are required.');
      return;
    }
    if (!effectiveSlug) {
      setError('Could not derive a URL slug. Enter one manually.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const project = await createProject({
        name: name.trim(),
        slug: effectiveSlug,
        city: city.trim(),
        locality: locality.trim(),
        description: description.trim(),
        property_type: propertyType,
        starting_price: startingPrice ? Number(startingPrice) : null,
        status: 'draft',
      });
      router.replace(`/builder/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView type="background" style={styles.root}>
      <Stack.Screen options={{ title: 'New project' }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.content, { maxWidth: MaxContentWidth }]}
            keyboardShouldPersistTaps="handled">
            <TextField label="Project name *" placeholder="Aurora Skyline" value={name} onChangeText={setName} />
            <TextField
              label="URL slug"
              placeholder="auto-generated from name"
              autoCapitalize="none"
              value={slug}
              onChangeText={setSlug}
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextField label="City *" placeholder="Chennai" value={city} onChangeText={setCity} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Locality" placeholder="ECR" value={locality} onChangeText={setLocality} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="smallBold">Property type</ThemedText>
              <View style={styles.chipRow}>
                {PROPERTY_TYPES.map((option) => {
                  const selected = propertyType === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setPropertyType(option.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? theme.primary : theme.backgroundElement,
                          borderColor: selected ? theme.primary : theme.border,
                        },
                      ]}>
                      <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TextField
              label="Starting price (₹)"
              placeholder="12500000"
              keyboardType="numeric"
              value={startingPrice}
              onChangeText={setStartingPrice}
            />
            <TextField
              label="Description"
              placeholder="What makes this project special?"
              multiline
              style={[styles.multiline, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={description}
              onChangeText={setDescription}
            />

            {error && <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>}
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Projects start as DRAFT — activate them from the console to publish.
            </ThemedText>
            <PrimaryButton label="Create project" onPress={handleSubmit} loading={isSubmitting} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 4,
  },
  multiline: {
    height: 96,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 4,
    textAlignVertical: 'top',
    fontSize: 16,
  },
});
