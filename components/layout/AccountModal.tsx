import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import supabase from '@/lib/db/client';
import { authedFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Typography } from '@/components/ui/Typography';

interface AccountProfileData {
  display_name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  interests_user: string[];
  timezone: string;
  intelligence_enabled: boolean;
  username_changes_remaining: number;
  username_change_next_available_at: string | null;
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

// Only needed for the Supabase Storage upload path below (avatars/<userId>/avatar.jpg),
// which uses the ambient client session directly rather than a Bearer header. All
// /api/* calls go through authedFetch instead, which resolves its own token.
async function getUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  }) => void;
}

export function AccountModal({ visible, onClose, onSaved }: AccountModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameChangesRemaining, setUsernameChangesRemaining] = useState(3);
  const [usernameChangeNextAvailableAt, setUsernameChangeNextAvailableAt] =
    useState<string | null>(null);
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
      try {
        const res = await authedFetch('/api/profile');
        if (!active) return;
        const body = (await res.json()) as ApiResponse<AccountProfileData>;
        if (!active) return;

        if (body.ok) {
          setDisplayName(body.data.display_name);
          setUsername(body.data.username);
          setOriginalUsername(body.data.username);
          setUsernameStatus('idle');
          setUsernameChangesRemaining(body.data.username_changes_remaining);
          setUsernameChangeNextAvailableAt(
            body.data.username_change_next_available_at,
          );
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

  const usernameCheckTokenRef = useRef(0);
  const usernameChanged = username !== originalUsername;
  const usernameValid = USERNAME_RE.test(username);

  useEffect(() => {
    const token = ++usernameCheckTokenRef.current;
    if (!visible || !usernameChanged || !usernameValid) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const handle = setTimeout(async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc(
          'check_username_available',
          { check_username: username },
        );
        if (token !== usernameCheckTokenRef.current) return;
        setUsernameStatus(rpcError ? 'error' : data ? 'available' : 'taken');
      } catch {
        if (token !== usernameCheckTokenRef.current) return;
        setUsernameStatus('error');
      }
    }, 400);

    return () => {
      clearTimeout(handle);
    };
  }, [username, usernameChanged, usernameValid, visible]);

  function handleUsernameChange(text: string) {
    setUsername(text.trimStart().toLowerCase());
  }

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

    const userId = await getUserId();
    if (!userId) {
      setError('Session expired. Please log in again.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uri = result.assets[0].uri;
      const fetched = await fetch(uri);
      const blob = await fetched.blob();

      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);

      const patchRes = await authedFetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrlData.publicUrl }),
      });
      const patchBody = (await patchRes.json()) as ApiResponse<AccountProfileData>;
      if (!patchBody.ok) throw new Error(patchBody.error.message);

      setAvatarUrl(patchBody.data.avatar_url);
      onSaved({
        display_name: patchBody.data.display_name,
        username: patchBody.data.username,
        avatar_url: patchBody.data.avatar_url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSave() {
    setError(null);

    if (!usernameValid) {
      setError('Username must be 3–20 lowercase letters, numbers, or underscores.');
      return;
    }
    if (usernameChanged && usernameStatus === 'taken') {
      setError('That username is already taken.');
      return;
    }
    if (usernameChanged && usernameChangesRemaining === 0) {
      setError('You have used all 3 username changes for the current 7-day period.');
      return;
    }

    const interestsArray = interestsText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setIsSaving(true);
    try {
      const res = await authedFetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          bio,
          timezone: timezone.trim(),
          interests_user: interestsArray,
        }),
      });
      const body = (await res.json()) as ApiResponse<AccountProfileData>;

      if (body.ok) {
        setOriginalUsername(body.data.username);
        setUsernameChangesRemaining(body.data.username_changes_remaining);
        setUsernameChangeNextAvailableAt(
          body.data.username_change_next_available_at,
        );
        onSaved({
          display_name: body.data.display_name,
          username: body.data.username,
          avatar_url: body.data.avatar_url,
        });
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
        <ActivityIndicator size="small" color="#A79E8E" />
      ) : loadError ? (
        <Typography variant="subtitle">
          Couldn't load your profile. Please try again.
        </Typography>
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
                  backgroundColor: '#1E3226',
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
            <Input
              label="Username"
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="your_username"
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              maxLength={20}
              error={
                username.length > 0 && !usernameValid
                  ? 'Use 3–20 lowercase letters, numbers, or underscores.'
                  : usernameStatus === 'taken'
                    ? 'That username is already taken.'
                    : null
              }
            />
            <Typography variant="hint" className="mt-1.5">
              {usernameChanged && usernameStatus === 'checking'
                ? 'Checking availability…'
                : usernameChanged && usernameStatus === 'available'
                  ? 'Username available. '
                  : ''}
              {usernameChangesRemaining > 0
                ? `${usernameChangesRemaining} of 3 changes remaining in the current 7-day period.`
                : usernameChangeNextAvailableAt
                  ? `Next change available ${new Date(
                      usernameChangeNextAvailableAt,
                    ).toLocaleString()}.`
                  : 'All 3 changes have been used in the current 7-day period.'}
            </Typography>
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
