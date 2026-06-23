import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ReflectionCard } from '@/components/ui/ReflectionCard';
import { getEntryById } from '../services/echo-service';
import type { EchoEntry } from '../types';

type EchoDetailScreenProps = {
  entryId: string;
};

export function EchoDetailScreen({ entryId }: EchoDetailScreenProps) {
  const [entry, setEntry] = useState<EchoEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getEntryById(entryId)
      .then((result) => {
        if (active) setEntry(result);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [entryId]);

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
      ) : !entry ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: '#6B7B6E', textAlign: 'center' }}>
            This reflection couldn't be found.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <ReflectionCard
            variant="full"
            timestamp={entry.createdAt.toISOString()}
            aiResponse={entry.aiResponse ?? entry.content}
            brt={entry.brt ?? null}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
