import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { createEmptyDocument } from '../utils';
import { useEntriesStore } from '../store';
import { EntriesLibrary } from './EntriesLibrary';
import { ReflectionLauncher } from './ReflectionLauncher';

export function EntriesScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const params = useLocalSearchParams<{ create?: string | string[] }>();
  const createEntry = useEntriesStore((state) => state.createEntry);
  const [createError, setCreateError] = useState<string | null>(null);
  const handledCreateRef = useRef(false);

  useEffect(() => {
    const createParam = Array.isArray(params.create) ? params.create[0] : params.create;
    if (createParam !== 'note' || handledCreateRef.current) return;
    handledCreateRef.current = true;
    void createEntry({
      entryType: 'note',
      title: '',
      content: createEmptyDocument(),
      plainText: '',
      relationships: { goalIds: [], categoryIds: [], milestoneIds: [] },
    }).then((entry) => {
      router.replace(`/(app)/entries/${entry.id}` as never);
    }).catch((error) => {
      setCreateError(error instanceof Error ? error.message : 'Could not create note');
      router.replace('/(app)/entries' as never);
    });
  }, [createEntry, params.create]);

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1, minHeight: 0 }}>
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          maxWidth: 1540,
          paddingBottom: 64,
          paddingHorizontal: compact ? 16 : width < 1100 ? 32 : 52,
          paddingTop: compact ? 24 : 36,
          width: '100%',
        }}
      >
        <View
          style={{
            alignItems: compact ? 'flex-start' : 'center',
            flexDirection: compact ? 'column' : 'row',
            gap: 18,
            marginBottom: compact ? 26 : 34,
          }}
        >
          <View style={{ flex: 1 }}>
            <Typography
              variant="heading"
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: compact ? 32 : 42,
                letterSpacing: -1,
                lineHeight: compact ? 39 : 50,
              }}
            >
              Entries
            </Typography>
            <Typography variant="body" style={{ marginTop: 5 }}>
              Notes and reflections, together in one continuous record.
            </Typography>
          </View>
        </View>

        {createError ? (
          <Typography
            accessibilityRole="alert"
            variant="caption"
            style={{ color: colors.feedback.danger.text, marginBottom: 16 }}
          >
            {createError}
          </Typography>
        ) : null}

        <View style={{ gap: compact ? 24 : 32 }}>
          <ReflectionLauncher />
          <EntriesLibrary />
        </View>
      </ScrollView>
    </View>
  );
}
