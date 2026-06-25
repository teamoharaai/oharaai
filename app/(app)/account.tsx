import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import supabase from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';

interface ProfileData {
  display_name: string;
  timezone: string;
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function AccountScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;

    async function load() {
      const token = await getAccessToken();
      if (!token || !active.current) return;

      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json()) as ApiResponse<ProfileData>;
        if (!active.current) return;

        if (body.ok) {
          setDisplayName(body.data.display_name);
          setTimezone(body.data.timezone);
        } else {
          setLoadError(true);
        }
      } catch {
        if (active.current) setLoadError(true);
      } finally {
        if (active.current) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active.current = false;
    };
  }, []);

  async function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);

    if (displayName.trim() === '') {
      setSaveError('Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    const token = await getAccessToken();
    if (!token) {
      setSaveError('Session expired. Please log in again.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ display_name: displayName.trim(), timezone: timezone.trim() }),
      });
      const body = (await res.json()) as ApiResponse<ProfileData>;
      if (!active.current) return;

      if (body.ok) {
        setDisplayName(body.data.display_name);
        setTimezone(body.data.timezone);
        setSaveSuccess(true);
      } else {
        setSaveError(body.error.message);
      }
    } catch {
      if (active.current) setSaveError('Failed to save. Please try again.');
    } finally {
      if (active.current) setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: '#4A7C5F' }}>← Back</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color="#9CAF9F" />
        </View>
      ) : loadError ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <Text
            style={{ fontFamily: 'Inter', fontSize: 15, color: '#6B7B6E', textAlign: 'center' }}
          >
            Couldn't load your profile. Please try again.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}>
          <Text
            style={{
              fontFamily: 'Inter',
              fontSize: 22,
              fontWeight: '600',
              color: '#1A1A1A',
              marginBottom: 24,
            }}
          >
            Account
          </Text>

          <View style={{ marginBottom: 20 }}>
            <Text
              style={{ fontFamily: 'Inter', fontSize: 13, color: '#6B7280', marginBottom: 6 }}
            >
              Display name
            </Text>
            <TextInput
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);
                setSaveSuccess(false);
              }}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontFamily: 'Inter',
                fontSize: 15,
                color: '#1A1A1A',
              }}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
          </View>

          <View style={{ marginBottom: 28 }}>
            <Text
              style={{ fontFamily: 'Inter', fontSize: 13, color: '#6B7280', marginBottom: 6 }}
            >
              Timezone
            </Text>
            <TextInput
              value={timezone}
              onChangeText={(v) => {
                setTimezone(v);
                setSaveSuccess(false);
              }}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontFamily: 'Inter',
                fontSize: 15,
                color: '#1A1A1A',
              }}
              placeholder="e.g. America/New_York"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {saveError ? (
            <Text
              style={{ fontFamily: 'Inter', fontSize: 13, color: '#EF4444', marginBottom: 12 }}
            >
              {saveError}
            </Text>
          ) : saveSuccess ? (
            <Text
              style={{ fontFamily: 'Inter', fontSize: 13, color: '#4A7C5F', marginBottom: 12 }}
            >
              Saved.
            </Text>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={{
              backgroundColor: '#3D5247',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}
              >
                Save
              </Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
