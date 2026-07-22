import { useEffect, useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { Typography } from './Typography';
import { useThemeColors } from '@/store/uiStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatMessageListProps {
  messages: ChatMessage[];
  /** When true, shows a typing indicator as a trailing assistant message. */
  isLoading?: boolean;
}

/** Single message row with a subtle opacity fade-in on mount. */
function ChatMessageRow({ message }: { message: ChatMessage }) {
  const colors = useThemeColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const isUser = message.role === 'user';

  useEffect(() => {
    Animated.timing(opacity, {
      duration: 150,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        alignItems: isUser ? 'flex-end' : 'flex-start',
        opacity,
        width: '100%',
      }}
    >
      {isUser ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={`You said: ${message.content}`}
          style={{
            backgroundColor: colors.background.selectedRow,
            borderColor: colors.border.warm,
            borderRadius: 18,
            borderWidth: 1,
            maxWidth: '80%',
            paddingHorizontal: 16,
            paddingVertical: 11,
          }}
        >
          <Typography variant="content" style={{ color: colors.text.primary }}>
            {message.content}
          </Typography>
        </View>
      ) : (
        <View
          accessibilityRole="text"
          accessibilityLabel={`Ohara said: ${message.content}`}
          style={{ maxWidth: '90%', paddingVertical: 2 }}
        >
          <Typography
            variant="content"
            style={{ color: colors.text.primary, fontSize: 15, lineHeight: 23 }}
          >
            {message.content}
          </Typography>
        </View>
      )}
    </Animated.View>
  );
}

/** Three-dot typing indicator, left-aligned like an assistant message. */
function TypingIndicator() {
  const colors = useThemeColors();
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      accessibilityLabel="Ohara is typing"
      accessibilityRole="text"
      style={{ alignItems: 'flex-start', width: '100%' }}
    >
      <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 6 }}>
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={{
              backgroundColor: colors.text.muted,
              borderRadius: 4,
              height: 7,
              opacity: dot,
              width: 7,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function ChatMessageList({ messages, isLoading = false }: ChatMessageListProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Defer so layout settles before scrolling to the newest content.
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 30);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      contentContainerStyle={{ gap: 16, paddingVertical: 8 }}
      style={{ flex: 1 }}
    >
      {messages.map((message) => (
        <ChatMessageRow key={message.id} message={message} />
      ))}
      {isLoading ? <TypingIndicator /> : null}
    </ScrollView>
  );
}

export default ChatMessageList;
