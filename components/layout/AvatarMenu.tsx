import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { authedFetch, signOutAndRedirect } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import { Avatar } from '@/components/ui/Avatar';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { AccountModal } from './AccountModal';
import { SettingsModal } from './SettingsModal';

interface ProfileSummary {
  display_name: string;
  avatar_url: string | null;
}

export function AvatarMenu() {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await authedFetch('/api/profile');
        if (!active) return;
        const body = (await res.json()) as ApiResponse<ProfileSummary>;
        if (active && body.ok) {
          setProfile({ display_name: body.data.display_name, avatar_url: body.data.avatar_url });
        }
      } catch {
        // Silent — avatar falls back to initials/empty. Non-blocking, matches
        // the rest of the app's "never let a profile fetch block chrome" convention.
        // (A genuinely expired/invalid session still redirects to login via
        // authedFetch — this only swallows network/other failures.)
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    // RN's core Image component (in use here — expo-image is not installed) has
    // no cross-platform cache-clear API, unlike expo-image's clearDiskCache/
    // clearMemoryCache. Nothing to call. Flagged in OUTSTANDING.md.
    await signOutAndRedirect();
  }

  const displayName = profile?.display_name ?? '';
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 12,
          marginBottom: 4,
        }}
        activeOpacity={0.7}
      >
        <Avatar avatarUrl={avatarUrl} displayName={displayName} size={36} />
      </TouchableOpacity>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.background.page,
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 300,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <Avatar avatarUrl={avatarUrl} displayName={displayName} size={44} />
                <Text
                  style={{
                    marginLeft: 12,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 15,
                    color: colors.text.primary,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {displayName || 'Your account'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={toggleTheme}
                accessibilityRole="button"
                accessibilityLabel={
                  themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
                }
                accessibilityHint="Changes the app appearance"
                style={{
                  width: 40,
                  height: 40,
                  marginLeft: 12,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.background.input,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                }}
                activeOpacity={0.7}
              >
                <BrandIcon name="theme-mode" size={36} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                setAccountOpen(true);
              }}
              style={{ paddingVertical: 12 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: colors.text.primary }}>
                Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              style={{ paddingVertical: 12 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: colors.text.primary }}>
                Settings
              </Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: colors.border.divider, marginVertical: 4 }} />

            <TouchableOpacity onPress={handleSignOut} style={{ paddingVertical: 12 }} activeOpacity={0.7}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: colors.feedback.danger.text }}>
                Log out
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <AccountModal
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        onSaved={(updated) => setProfile(updated)}
      />

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
