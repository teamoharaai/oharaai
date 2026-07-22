import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, ScrollView, View, useWindowDimensions } from 'react-native';
import { Typography } from './Typography';
import { FocusedField } from '@/constants/focused-tokens';
import { useThemeColors } from '@/store/uiStore';

export interface FocusedChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/** Compatible with the existing goal-chat message state. */
export type ChatMessage = FocusedChatMessage;

export interface FocusedChatMessageListProps {
  messages: FocusedChatMessage[];
  isLoading?: boolean;
  /** Rendered immediately after the final turn, for the curated goal pair. */
  trailingSlot?: ReactNode;
}

function EchoLabel() {
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 5 }}>
      <View
        style={{
          backgroundColor: FocusedField.accent.primary,
          borderRadius: 3,
          height: 5,
          shadowColor: FocusedField.accent.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 4,
          width: 5,
        }}
      />
      <Typography
        style={{
          color: FocusedField.accent.primary,
          fontFamily: 'Inter-SemiBold',
          fontSize: 10,
          letterSpacing: 1.8,
        }}
      >
        ECHO
      </Typography>
    </View>
  );
}

function AssistantTurn({ content }: { content: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { duration: 150, toValue: 1, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity, width: '100%' }}>
      <EchoLabel />
      <Typography
        accessibilityLabel={`Echo said: ${content}`}
        accessibilityRole="text"
        style={{
          color: FocusedField.text.inverse,
          fontFamily: 'Lora-Regular',
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {content}
      </Typography>
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
      style={{ alignItems: 'flex-end', marginLeft: '22%', opacity, width: '78%' }}
    >
      <Typography
        style={{
          color: FocusedField.text.faint,
          fontFamily: 'Inter-SemiBold',
          fontSize: 10,
          letterSpacing: 1.8,
          marginBottom: 4,
        }}
      >
        YOU
      </Typography>
      <Typography
        accessibilityLabel={`You said: ${content}`}
        accessibilityRole="text"
        style={{
          color: FocusedField.text.secondary,
          fontFamily: 'Inter-Regular',
          fontSize: 13.5,
          lineHeight: 20,
          textAlign: 'right',
        }}
      >
        {content}
      </Typography>
    </Animated.View>
  );
}

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(dot, { duration: 320, toValue: 1, useNativeDriver: true }),
          Animated.timing(dot, { duration: 320, toValue: 0.3, useNativeDriver: true }),
          Animated.delay((dots.length - index) * 160),
        ]),
      ),
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);

  return (
    <View accessibilityLabel="Echo is typing" accessibilityRole="text" style={{ width: '100%' }}>
      <EchoLabel />
      <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={{
              backgroundColor: FocusedField.accent.primary,
              borderRadius: 4,
              height: 6,
              opacity: dot,
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
  useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
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
      contentContainerStyle={{
        gap: 14,
        paddingHorizontal: compact ? 16 : 72,
        paddingVertical: 8,
      }}
      style={{ flex: 1 }}
    >
      {messages.map((message) =>
        message.role === 'user' ? (
          <UserTurn key={message.id} content={message.content} />
        ) : (
          <AssistantTurn key={message.id} content={message.content} />
        ),
      )}
      {isLoading ? <TypingIndicator /> : null}
      {trailingSlot}
    </ScrollView>
  );
}

export default FocusedChatMessageList;
