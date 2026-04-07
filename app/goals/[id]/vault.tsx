import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import supabase from '@/lib/db/client';
import { getOrCreateVault, getVaultItems, addVaultItem } from '@/lib/db/vaults';
import type { VaultItem } from '@/lib/db/vaults';

export default function VaultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : (id ?? '');

  const [vaultId, setVaultId] = useState<string | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!goalId) return;
    let cancelled = false;

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) throw new Error('Not authenticated');
        userIdRef.current = userId;

        const vid = await getOrCreateVault(goalId, userId);
        if (cancelled) return;
        setVaultId(vid);

        const fetched = await getVaultItems(vid);
        if (cancelled) return;
        setItems(fetched);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load vault';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  async function handleSave() {
    const trimmed = input.trim();
    if (!trimmed || !vaultId || !userIdRef.current || saving) return;
    setSaving(true);
    try {
      await addVaultItem(vaultId, userIdRef.current, trimmed);
      const refreshed = await getVaultItems(vaultId);
      setItems(refreshed);
      setInput('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save entry';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      {/* Nav */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: '#4A7C5F' }}>← Back</Text>
        </Pressable>
        <Text style={{ fontFamily: 'Inter', fontSize: 15, color: '#9CAF9F', marginHorizontal: 8 }}>
          |
        </Text>
        <Text
          style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: '#1A1F1C' }}
        >
          Vault
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#3D5247" />
        </View>
      ) : error ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <Text style={{ fontSize: 14, color: '#EF4444', textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Add entry */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 1,
            }}
          >
            <TextInput
              style={{
                fontSize: 14,
                color: '#1A1F1C',
                backgroundColor: '#F5F1EA',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#EAE7E0',
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Add a note…"
              placeholderTextColor="#9CAF9F"
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity
              style={{
                alignSelf: 'flex-end',
                backgroundColor: '#3D5247',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
                opacity: saving || !input.trim() ? 0.5 : 1,
              }}
              onPress={handleSave}
              disabled={saving || !input.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Entries */}
          {items.length === 0 ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 1,
              }}
            >
              <Text style={{ fontFamily: 'Inter', fontSize: 14, color: '#9CAF9F' }}>
                No entries yet.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 14,
                    color: '#1A1F1C',
                    lineHeight: 20,
                    marginBottom: 6,
                  }}
                >
                  {item.content}
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: '#9CAF9F' }}>
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
