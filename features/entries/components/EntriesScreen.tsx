import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors, useUIStore, type EntriesTab } from '@/store/uiStore';
import { createEmptyDocument } from '../utils';
import { useEntriesStore } from '../store';
import { EntriesSegmentedControl } from './EntriesSegmentedControl';
import { NotesLibrary } from './NotesLibrary';
import { ReflectionsLanding } from './ReflectionsLanding';

function routeTab(value: string | string[] | undefined): EntriesTab | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === 'notes' || normalized === 'reflections' ? normalized : null;
}

export function EntriesScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const params = useLocalSearchParams<{ tab?: string | string[]; create?: string | string[] }>();
  const storedTab = useUIStore((state) => state.entriesTab);
  const setStoredTab = useUIStore((state) => state.setEntriesTab);
  const createEntry = useEntriesStore((state) => state.createEntry);
  const [createError, setCreateError] = useState<string | null>(null);
  const handledCreateRef = useRef(false);
  const activeTab = routeTab(params.tab) ?? storedTab;

  useEffect(() => {
    const requested = routeTab(params.tab);
    if (requested && requested !== storedTab) setStoredTab(requested);
  }, [params.tab, setStoredTab, storedTab]);

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
      router.replace('/(app)/entries?tab=notes' as never);
    });
  }, [createEntry, params.create]);

  function changeTab(tab: EntriesTab) {
    setStoredTab(tab);
    router.replace({
      pathname: '/(app)/entries',
      params: { tab },
    } as never);
  }

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
              Notes for what you want to keep. Reflections for what you want to understand.
            </Typography>
          </View>
          <EntriesSegmentedControl compact={compact} onChange={changeTab} value={activeTab} />
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

        {activeTab === 'notes' ? <NotesLibrary /> : <ReflectionsLanding />}
      </ScrollView>
    </View>
  );
}
