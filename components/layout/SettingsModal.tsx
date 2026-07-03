import { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import supabase from '@/lib/db/client';
import type { ApiResponse } from '@/lib/api/contracts';
import { Modal } from '@/components/ui/Modal';

interface SettingsProfileData {
  intelligence_enabled: boolean;
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setIsLoading(true);
    setLoadError(false);

    async function load() {
      const token = await getAccessToken();
      if (!token || !active) return;

      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    return () => {
      active = false;
    };
  }, [visible]);

  async function handleToggle(next: boolean) {
    const previous = intelligenceEnabled;
    setIntelligenceEnabled(next);
    setIsSaving(true);

    const token = await getAccessToken();
    if (!token) {
      setIntelligenceEnabled(previous);
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
      <Text className="text-xl text-near-black mb-5" style={{ fontFamily: 'Inter-SemiBold' }}>
        Settings
      </Text>

      {isLoading ? (
        <ActivityIndicator size="small" color="#9CAF9F" />
      ) : loadError ? (
        <Text className="text-sm text-[#6B7280]" style={{ fontFamily: 'Inter-Regular' }}>
          Couldn't load your settings. Please try again.
        </Text>
      ) : (
        <View>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-base text-near-black"
              style={{ fontFamily: 'Inter-Medium' }}
            >
              AI Reflections
            </Text>
            {isSaving ? (
              <ActivityIndicator size="small" color="#9CAF9F" />
            ) : (
              <Switch
                value={intelligenceEnabled}
                onValueChange={handleToggle}
                trackColor={{ false: '#D1D5DB', true: '#3D5247' }}
                thumbColor="#FFFFFF"
              />
            )}
          </View>
          <Text
            className="text-xs text-[#6B7280] mt-2"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            When off, Echo entries are saved without AI analysis.
          </Text>
        </View>
      )}
    </Modal>
  );
}
