import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import supabase from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';

interface AccountProfileData {
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  interests_user: string[];
  timezone: string;
  intelligence_enabled: boolean;
}

async function getAccessTokenAndUserId(): Promise<{ token: string; userId: string } | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token || !session.user?.id) return null;
  return { token: session.access_token, userId: session.user.id };
}

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (profile: { display_name: string; avatar_url: string | null }) => void;
}

export function AccountModal({ visible, onClose, onSaved }: AccountModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    setError(null);

    async function load() {
      const auth = await getAccessTokenAndUserId();
      if (!auth || !active) return;

      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const body = (await res.json()) as ApiResponse<AccountProfileData>;
        if (!active) return;

        if (body.ok) {
          setDisplayName(body.data.display_name);
          setBio(body.data.bio ?? '');
          setAvatarUrl(body.data.avatar_url);
          setTimezone(body.data.timezone);
          setInterestsText(body.data.interests_user.join(', '));
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
    return () => {
      active = false;
    };
  }, [visible]);

  async function handlePickAvatar() {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to update your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets?.[0]) return;

    const auth = await getAccessTokenAndUserId();
    if (!auth) {
      setError('Session expired. Please log in again.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uri = result.assets[0].uri;
      const fetched = await fetch(uri);
      const blob = await fetched.blob();

      const path = `${auth.userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);

      const patchRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: publicUrlData.publicUrl }),
      });
      const patchBody = (await patchRes.json()) as ApiResponse<AccountProfileData>;
      if (!patchBody.ok) throw new Error(patchBody.error.message);

      setAvatarUrl(patchBody.data.avatar_url);
      onSaved({ display_name: patchBody.data.display_name, avatar_url: patchBody.data.avatar_url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSave() {
    setError(null);

    if (displayName.trim() === '') {
      setError('Display name cannot be empty.');
      return;
    }

    const auth = await getAccessTokenAndUserId();
    if (!auth) {
      setError('Session expired. Please log in again.');
      return;
    }

    const interestsArray = interestsText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio,
          timezone: timezone.trim(),
          interests_user: interestsArray,
        }),
      });
      const body = (await res.json()) as ApiResponse<AccountProfileData>;

      if (body.ok) {
        onSaved({ display_name: body.data.display_name, avatar_url: body.data.avatar_url });
        onClose();
      } else {
        setError(body.error.message);
      }
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      cancelText="Cancel"
      onCancel={onClose}
      confirmText="Save"
      onConfirm={handleSave}
      confirmDisabled={isSaving || isLoading || !!loadError}
      showCloseButton={false}
    >
      <Text className="text-xl text-near-black mb-5" style={{ fontFamily: 'Inter-SemiBold' }}>
        Account
      </Text>

      {isLoading ? (
        <ActivityIndicator size="small" color="#9CAF9F" />
      ) : loadError ? (
        <Text className="text-sm text-[#6B7280]" style={{ fontFamily: 'Inter-Regular' }}>
          Couldn't load your profile. Please try again.
        </Text>
      ) : (
        <View>
          <View className="items-center mb-5">
            <View>
              <Avatar avatarUrl={avatarUrl} displayName={displayName} size={72} />
              <Pressable
                onPress={handlePickAvatar}
                disabled={isUploadingAvatar}
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: '#3D5247',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#FAF9F6',
                }}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 12 }}>📷</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View className="mb-4">
            <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" autoCapitalize="words" />
          </View>

          <View className="mb-4">
            <Input label="Bio" value={bio} onChangeText={setBio} placeholder="A short bio" multiline />
          </View>

          <View className="mb-4">
            <Input
              label="Timezone"
              value={timezone}
              onChangeText={setTimezone}
              placeholder="e.g. America/New_York"
              autoCapitalize="none"
            />
          </View>

          <View className="mb-2">
            <Input
              label="Interests"
              value={interestsText}
              onChangeText={setInterestsText}
              placeholder="e.g. hiking, painting, jazz"
              autoCapitalize="none"
            />
          </View>

          {error ? (
            <Text className="text-sm text-[#EF4444] mt-2" style={{ fontFamily: 'Inter-Regular' }}>
              {error}
            </Text>
          ) : null}
        </View>
      )}
    </Modal>
  );
}
