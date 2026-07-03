import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import supabase from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';
import { clearAllStores } from '@/store/clearAllStores';
import { Avatar } from '@/components/ui/Avatar';
import { AccountModal } from './AccountModal';
import { SettingsModal } from './SettingsModal';

interface ProfileSummary {
  display_name: string;
  avatar_url: string | null;
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function AvatarMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const token = await getAccessToken();
      if (!token || !active) return;

      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json()) as ApiResponse<ProfileSummary>;
        if (active && body.ok) {
          setProfile({ display_name: body.data.display_name, avatar_url: body.data.avatar_url });
        }
      } catch {
        // Silent — avatar falls back to initials/empty. Non-blocking, matches
        // the rest of the app's "never let a profile fetch block chrome" convention.
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    clearAllStores();
    await supabase.auth.signOut({ scope: 'local' });
    // RN's core Image component (in use here — expo-image is not installed) has
    // no cross-platform cache-clear API, unlike expo-image's clearDiskCache/
    // clearMemoryCache. Nothing to call. Flagged in OUTSTANDING.md.
    router.replace('/(auth)/login' as Parameters<typeof router.replace>[0]);
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
              backgroundColor: '#F5F1EA',
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 300,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Avatar avatarUrl={avatarUrl} displayName={displayName} size={44} />
              <Text
                style={{
                  marginLeft: 12,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 15,
                  color: '#1A1F1C',
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {displayName || 'Your account'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                setAccountOpen(true);
              }}
              style={{ paddingVertical: 12 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#1A1F1C' }}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              style={{ paddingVertical: 12 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#1A1F1C' }}>Settings</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#E5E1D8', marginVertical: 4 }} />

            <TouchableOpacity onPress={handleSignOut} style={{ paddingVertical: 12 }} activeOpacity={0.7}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#DC2626' }}>Log out</Text>
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
