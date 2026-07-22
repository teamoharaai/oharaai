/**
 * FocusedChatMessageList — bubble-less chat rendering for the Focused Field redesign.
 *
 * Copy to: components/ui/FocusedChatMessageList.tsx
 * Replaces: ChatMessageList inside AIGoalCreation.tsx (behind FEATURES.focusedFieldChat).
 *
 * Behavior contract is unchanged: same ChatMessage shape, same isLoading typing dot,
 * same imperative scroll-to-end. Only the styling differs — Echo speaks in Lora serif,
 * the user replies in Inter (indented right), and there are no bubbles or avatars.
 */
import { useEffect, useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { Typography } from './Typography';
import { FocusedField as T } from '@/constants/focused-tokens';
import { useThemeColors } from '@/store/uiStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface FocusedChatMessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  /** Rendered after the last assistant message. Use for the option-cards pair. */
  trailingSlot?: React.ReactNode;
}

function EchoLabel() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: T.accent.primary,
          // React Native has no CSS text-shadow; ambient glow is a Web-only accent.
          // Web builds pick up the boxShadow; native ignores it.
          boxShadow: T.accent.focusGlow,
        }}
      />
      <Typography style={{ ...T.type.label, color: T.accent.primary }}>ECHO</Typography>
    </View>
  );
}

function YouLabel() {
  return (
    <Typography style={{ ...T.type.label, color: T.text.faint, marginBottom: 4 }}>
      YOU
    </Typography>
  );
}

function AssistantTurn({ content }: { content: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { duration: 150, toValue: 1, useNativeDriver: true }).start();
  }, [opacity]);
  return (
    <Animated.View style={{ opacity, alignItems: 'flex-start', width: '100%' }}>
      <EchoLabel />
      <Typography style={{ ...T.type.echoTurn, color: T.text.inverse }}>{content}</Typography>
    </Animated.View>
  );
}

function UserTurn({ content }: { content: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { duration: 150, toValue: 1, useNativeDriver: true }).start();
  }, [opacity]);
  return (
    <Animated.View
      style={{ opacity, alignItems: 'flex-end', width: '100%', paddingLeft: '22%' }}
    >
      <YouLabel />
      <Typography style={{ ...T.type.userTurn, color: T.text.secondary, textAlign: 'right' }}>
        {content}
      </Typography>
    </Animated.View>
  );
}

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { duration: 320, toValue: 1, useNativeDriver: true }),
          Animated.timing(d, { duration: 320, toValue: 0.3, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 160),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ alignItems: 'flex-start', width: '100%' }}>
      <EchoLabel />
      <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={{
              backgroundColor: T.accent.primary,
              borderRadius: 4,
              height: 6,
              opacity: d,
              width: 6,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function FocusedChatMessageList({
  messages,
  isLoading = false,
  trailingSlot,
}: FocusedChatMessageListProps) {
  useThemeColors(); // subscribe for re-render on theme change
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 30);
    return () => clearTimeout(timer);
  }, [messages, isLoading, trailingSlot]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      contentContainerStyle={{ gap: 14, paddingVertical: 8, paddingHorizontal: 72 }}
      style={{ flex: 1 }}
    >
      {messages.map((m) =>
        m.role === 'user' ? (
          <UserTurn key={m.id} content={m.content} />
        ) : (
          <AssistantTurn key={m.id} content={m.content} />
        ),
      )}
      {isLoading ? <TypingIndicator /> : null}
      {trailingSlot}
    </ScrollView>
  );
}

export default FocusedChatMessageList;
