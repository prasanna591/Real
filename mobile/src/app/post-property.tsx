import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { PrimaryButton } from '@/components/primary-button';
import { FormError, SuccessCard, validateEmail, validatePhone } from '@/components/contact-form';
import { LoginPrompt } from '@/components/login-prompt';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { submitListingRequest, submitListingRequestImages } from '@/services/api';

const MAX_IMAGES = 5;

const PROPERTY_TYPES = [
  { value: 'luxury_apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'premium_residence', label: 'Residence' },
  { value: 'waterfront', label: 'Waterfront' },
];

const CITIES = ['Mumbai', 'Bengaluru', 'Pune', 'Delhi NCR'];

export default function PostPropertyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, isLoading: sessionLoading } = useSession();

  const [loginVisible, setLoginVisible] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [nameInput, setName] = useState<string | null>(null);
  const [phoneInput, setPhone] = useState<string | null>(null);
  const [emailInput, setEmail] = useState<string | null>(null);
  const name = nameInput ?? user?.name ?? '';
  const phone = phoneInput ?? user?.phone ?? '';
  const email = emailInput ?? user?.email ?? '';

  // Only raise the login gate once the saved session has finished restoring —
  // `user` is null during the initial load even for signed-in users.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guards login modal until session restores
    if (!sessionLoading && !user) setLoginVisible(true);
  }, [sessionLoading, user]);

  const [propertyType, setPropertyType] = useState('');
  const [bhk, setBhk] = useState('');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (isSubmitting) return;
    if (name.trim().length < 1) {
      setError('Please enter your name');
      return;
    }
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (!propertyType) {
      setError('Please select a property type');
      return;
    }
    if (!city) {
      setError('Please select a city');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await submitListingRequest({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        property_type: propertyType,
        bhk: bhk ? Number(bhk) : undefined,
        city,
        locality: locality.trim(),
        expected_price: expectedPrice.trim(),
        description: description.trim(),
      });
      if (imageUris.length > 0) {
        await submitListingRequestImages(created.id, imageUris);
      }
      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit your property');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  };

  const pickImages = async () => {
    if (imageUris.length >= MAX_IMAGES) return;
    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - imageUris.length,
        quality: 0.7,
      });
      if (result.canceled) return;
      const newUris = result.assets
        .map((a) => a.uri)
        .filter((uri): uri is string => Boolean(uri));
      setImageUris((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    } catch {
      /* picker cancelled or failed */
    } finally {
      setIsPicking(false);
    }
  };

  if (isDone) {
    return (
      <SuccessCard
        title="Property submitted"
        message={
          <>
            Thanks {name.trim()}! Our team will review your listing and get back to you shortly
            to help you get it live.
          </>
        }
        onDone={() => router.back()}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="small" themeColor="textSecondary">
            List your property with us and reach thousands of buyers.
          </ThemedText>

          <View style={styles.form}>
            <TextField
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <TextField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={15}
            />
            <TextField
              label="Email (optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <ThemedText type="smallBold">Property type</ThemedText>
            <View style={styles.chipRow}>
              {PROPERTY_TYPES.map((pt) => (
                <Pressable
                  key={pt.value}
                  accessibilityRole="button"
                  onPress={() => setPropertyType(pt.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        propertyType === pt.value ? theme.text : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: propertyType === pt.value ? theme.background : theme.text }}>
                    {pt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <TextField
              label="BHK (optional)"
              value={bhk}
              onChangeText={setBhk}
              placeholder="e.g. 3"
              keyboardType="number-pad"
              maxLength={2}
            />

            <ThemedText type="smallBold">City</ThemedText>
            <View style={styles.chipRow}>
              {CITIES.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  onPress={() => setCity(c)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: city === c ? theme.text : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: city === c ? theme.background : theme.text }}>
                    {c}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <TextField
              label="Locality / area"
              value={locality}
              onChangeText={setLocality}
              placeholder="e.g. Andheri West"
              autoCapitalize="words"
            />
            <TextField
              label="Expected price (optional)"
              value={expectedPrice}
              onChangeText={setExpectedPrice}
              placeholder="e.g. ₹1.2 Cr"
              keyboardType="default"
            />
            <TextField
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Tell buyers about your property…"
              multiline
              style={styles.messageInput}
            />

            {/* Property photos */}
            <ThemedText type="smallBold">Photos ({imageUris.length}/{MAX_IMAGES})</ThemedText>
            {imageUris.length > 0 && (
              <View style={styles.photoGrid}>
                {imageUris.map((uri, index) => (
                  <View key={uri} style={styles.photoCell}>
                    <Image source={{ uri }} style={styles.photo} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      onPress={() =>
                        setImageUris((prev) => prev.filter((_, i) => i !== index))
                      }
                      style={styles.photoRemove}>
                      <Ionicons name="close" size={14} color="#FFF" />
                    </Pressable>
                  </View>
                ))}
                {imageUris.length < MAX_IMAGES && (
                  <AddPhotoTile onPress={pickImages} loading={isPicking} theme={theme} />
                )}
              </View>
            )}
            {imageUris.length === 0 && (
              <AddPhotoTile onPress={pickImages} loading={isPicking} theme={theme} />
            )}
          </View>

          <FormError error={error} />

          <PrimaryButton
            label="Submit my property"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </ScrollView>
      </SafeAreaView>

      {/* Login gate for posting */}
      <LoginPrompt
        visible={loginVisible}
        title="Log in to post your property"
        subtitle="Sign in with your phone to list your property. You can always browse the app without an account."
        onClose={() => {
          setLoginVisible(false);
          router.back();
        }}
        onSuccess={() => setLoginVisible(false)}
      />
    </ThemedView>
  );
}

function AddPhotoTile({
  onPress,
  loading,
  theme,
}: {
  onPress: () => void;
  loading: boolean;
  theme: (typeof Colors)['light' | 'dark'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      style={[
        styles.photoAddTile,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
      ]}>
      <Ionicons name={loading ? 'hourglass-outline' : 'image-outline'} size={22} color={theme.primary} />
      <ThemedText type="small" themeColor="textSecondary">
        Add photos
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  form: {
    gap: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 4,
    borderWidth: 1,
  },
  messageInput: {
    height: 96,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photoCell: {
    width: 88,
    height: 88,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTile: {
    width: 88,
    height: 88,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
});
