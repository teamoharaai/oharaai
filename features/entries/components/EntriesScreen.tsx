import { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { FeaturePageHeader } from '@/components/layout/FeaturePageHeader';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Typography } from '@/components/ui/Typography';
import { SPACE } from '@/constants/design';
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
    <AuthenticatedPageShell>
      <View style={{ minWidth: 0 }}>
        <View style={{ marginBottom: compact ? SPACE['4xl'] : SPACE['5xl'] }}>
          <FeaturePageHeader
            description="Notes and reflections, together in one continuous record."
            icon={<BrandIcon name="echo" size={22} tintColor={colors.accent.primary} />}
            title="Entries"
          />
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

        <View style={{ gap: compact ? SPACE['3xl'] : SPACE['4xl'] }}>
          <ReflectionLauncher />
          <EntriesLibrary />
        </View>
      </View>
    </AuthenticatedPageShell>
  );
}
