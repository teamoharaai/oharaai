import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { authedFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import supabase from '@/lib/db/client';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors, useUIStore } from '@/store/uiStore';

interface SettingsProfileData {
  intelligence_enabled: boolean;
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ArchivedGoalSummary {
  id: string;
  title: string;
  updated_at: string;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [archivedGoals, setArchivedGoals] = useState<ArchivedGoalSummary[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(true);
  const [archivedError, setArchivedError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    setArchivedLoading(true);
    setArchivedError(false);

    async function load() {
      try {
        const res = await authedFetch('/api/profile');
        if (!active) return;
        const body = (await res.json()) as ApiResponse<SettingsProfileData>;
        if (!active) return;

        if (body.ok) {
          setIntelligenceEnabled(body.data.intelligence_enabled);
        } else {
          setLoadError(true);
        }
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    async function loadArchivedGoals() {
      const { data, error } = await supabase
        .from('goals')
        .select('id, title, updated_at')
        .eq('status', 'archived')
        .order('updated_at', { ascending: false });

      if (!active) return;
      if (error) {
        setArchivedGoals([]);
        setArchivedError(true);
      } else {
        setArchivedGoals((data ?? []) as ArchivedGoalSummary[]);
      }
      setArchivedLoading(false);
    }

    void loadArchivedGoals();
    return () => {
      active = false;
    };
  }, [visible]);

  async function handleToggle(next: boolean) {
    const previous = intelligenceEnabled;
    setIntelligenceEnabled(next);
    setIsSaving(true);

    try {
      const res = await authedFetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intelligence_enabled: next }),
      });
      const body = (await res.json()) as ApiResponse<SettingsProfileData>;

      if (body.ok) {
        setIntelligenceEnabled(body.data.intelligence_enabled);
      } else {
        setIntelligenceEnabled(previous);
      }
    } catch {
      setIntelligenceEnabled(previous);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} onClose={onClose}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 620 }}
      >
        <Text
          className="mb-5 text-xl"
          style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold' }}
        >
          Settings
        </Text>

        <View className="mb-6">
          <Typography
            variant="eyebrow"
            className="mb-3"
            style={{ color: colors.text.secondary }}
          >
            Appearance
          </Typography>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-base"
              style={{ color: colors.text.primary, fontFamily: 'Inter-Medium' }}
            >
              Dark mode
            </Text>
            <Switch
              accessibilityLabel="Dark mode"
              value={themeMode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border.input, true: colors.accent.primary }}
              thumbColor={colors.text.primary}
            />
          </View>
          <Typography
            variant="hint"
            className="mt-2"
            style={{ color: colors.text.secondary }}
          >
            Choose the app appearance manually.
          </Typography>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.text.muted} />
        ) : loadError ? (
          <Typography variant="subtitle">
            Couldn't load your settings. Please try again.
          </Typography>
        ) : (
          <View>
            <Typography
              variant="eyebrow"
              className="mb-3"
              style={{ color: colors.text.secondary }}
            >
              Intelligence
            </Typography>
            <View className="flex-row items-center justify-between">
              <Text
                className="text-base"
                style={{ color: colors.text.primary, fontFamily: 'Inter-Medium' }}
              >
                AI Reflections
              </Text>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.text.muted} />
              ) : (
                <Switch
                  value={intelligenceEnabled}
                  onValueChange={handleToggle}
                  trackColor={{ false: colors.border.input, true: colors.accent.primary }}
                  thumbColor={colors.text.primary}
                />
              )}
            </View>
            <Typography
              variant="hint"
              className="mt-2"
              style={{ color: colors.text.secondary }}
            >
              When off, Echo entries are saved without AI analysis.
            </Typography>
          </View>
        )}

        <View
          style={{
            borderTopColor: colors.border.divider,
            borderTopWidth: 1,
            marginTop: 24,
            paddingTop: 22,
          }}
        >
          <Typography
            variant="eyebrow"
            className="mb-3"
            style={{ color: colors.text.secondary }}
          >
            Archived
          </Typography>

          {archivedLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.text.muted}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : archivedError ? (
            <Typography variant="hint">
              Couldn't load archived goals. Please try again.
            </Typography>
          ) : archivedGoals.length === 0 ? (
            <Typography variant="hint">Archived goals will appear here.</Typography>
          ) : (
            <View style={{ gap: 8 }}>
              {archivedGoals.map((goal) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open archived goal ${goal.title}`}
                  key={goal.id}
                  onPress={() => {
                    onClose();
                    router.push(`/(app)/goals/${goal.id}` as never);
                  }}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: colors.background.card,
                    borderColor: colors.border.warm,
                    borderRadius: 12,
                    borderWidth: 1,
                    flexDirection: 'row',
                    gap: 12,
                    opacity: pressed ? 0.72 : 1,
                    paddingHorizontal: 13,
                    paddingVertical: 11,
                  })}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      numberOfLines={1}
                      variant="emphasis-sm"
                      style={{ color: colors.text.primary }}
                    >
                      {goal.title}
                    </Typography>
                    <Typography variant="caption">Archived goal</Typography>
                  </View>
                  <Typography variant="caption" style={{ fontSize: 17 }}>›</Typography>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}
