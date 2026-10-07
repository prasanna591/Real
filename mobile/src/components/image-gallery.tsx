import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MediaAsset } from '@/types/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  media: MediaAsset[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageGallery({ media, initialIndex = 0, onClose }: Props) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList<MediaAsset>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const photos = media.filter(
    (m) => m.media_type === 'photo' || m.media_type === 'model_3d',
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  };

  if (photos.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        ref={flatListRef}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        keyExtractor={(item) => String(item.id)}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScroll={onScroll}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <Image
              source={{ uri: item.url }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          </View>
        )}
      />

      <View style={styles.gradient} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close gallery"
        onPress={onClose}
        style={[styles.closeBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        hitSlop={12}>
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </Pressable>

      {photos.length > 1 && (
        <View style={styles.pagination}>
          {photos.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === activeIndex
                  ? { backgroundColor: '#FFFFFF', width: 20 }
                  : { backgroundColor: 'rgba(255,255,255,0.5)' },
              ]}
            />
          ))}
        </View>
      )}

      <View style={styles.counter}>
        <ThemedText type="small" style={{ color: '#FFFFFF' }}>
          {activeIndex + 1} / {photos.length}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    top: undefined,
    height: 140,
    backgroundColor: 'transparent',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  counter: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
