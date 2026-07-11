import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LIGHT_THEME } from '@/constants/colors';
import type { EchoContainerOption } from '../types';

export type EchoFilterScope =
  | { type: 'all'; id: 'all'; label: 'All' }
  | { type: 'goal' | 'folder'; id: string; label: string };

type EchoFilterPillProps = {
  options: EchoContainerOption[];
  selectedScope: EchoFilterScope;
  onSelectScope: (scope: EchoFilterScope) => void;
};

const ALL_SCOPE: EchoFilterScope = { type: 'all', id: 'all', label: 'All' };

export function EchoFilterPill({
  options,
  selectedScope,
  onSelectScope,
}: EchoFilterPillProps) {
  const [open, setOpen] = useState(false);
  const scopes = useMemo<EchoFilterScope[]>(
    () => [
      ALL_SCOPE,
      ...options.map((option) => ({
        type: option.type,
        id: option.id,
        label: option.label,
      })),
    ],
    [options],
  );

  function selectScope(scope: EchoFilterScope) {
    onSelectScope(scope);
    setOpen(false);
  }

  return (
    <View style={{ position: 'relative', zIndex: open ? 40 : 1 }}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        className="flex-row items-center rounded-full px-3.5 py-1.5"
        style={{ backgroundColor: LIGHT_THEME.background.sidebar }}
      >
        <Text
          numberOfLines={1}
          className="font-sans"
          style={{
            color: LIGHT_THEME.text.inverse,
            fontFamily: 'Inter-Medium',
            fontSize: 13,
            lineHeight: 17,
            maxWidth: 180,
          }}
        >
          {selectedScope.label}
        </Text>
        <Text
          className="ml-1.5 font-sans"
          style={{ color: LIGHT_THEME.text.inverse, fontSize: 11, lineHeight: 14 }}
        >
          {'⌄'}
        </Text>
      </Pressable>

      {open ? (
        <>
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              position: 'fixed' as 'absolute',
              inset: 0,
              zIndex: 20,
            }}
          />
          <View
            className="rounded-[10px] border bg-white py-1 shadow-sm"
            style={{
              borderColor: LIGHT_THEME.border.divider,
              left: 0,
              minWidth: 220,
              maxHeight: 300,
              position: 'absolute',
              top: 36,
              zIndex: 30,
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {scopes.map((scope) => {
                const selected = selectedScope.type === scope.type && selectedScope.id === scope.id;
                return (
                  <Pressable
                    key={`${scope.type}-${scope.id}`}
                    onPress={() => selectScope(scope)}
                    className="px-3.5 py-2.5"
                    style={{
                      backgroundColor: selected ? LIGHT_THEME.background.selectedRow : 'transparent',
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      className="font-sans"
                      style={{
                        color: LIGHT_THEME.text.primary,
                        fontFamily: selected ? 'Inter-Bold' : 'Inter-Medium',
                        fontSize: 13,
                        lineHeight: 18,
                      }}
                    >
                      {scope.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}
