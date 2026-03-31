import { Text, TouchableOpacity, View } from 'react-native';

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function EmptyStateCard({
  title,
  description,
  actionLabel,
  onActionPress,
}: EmptyStateCardProps) {
  return (
    <View className="items-center rounded-xl border border-dark-border bg-dark-card px-6 py-10">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full border border-[#1B7A5A]/50 bg-[#1B7A5A]/10">
        <View className="h-2.5 w-2.5 rounded-full bg-[#6FDFB8]" />
      </View>
      <Text className="text-center text-lg font-semibold text-ink">{title}</Text>
      <Text className="mt-2 max-w-[260px] text-center text-sm leading-6 text-ink-dim">
        {description}
      </Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity
          className="mt-5 rounded-full border border-[#1B7A5A]/60 bg-[#1B7A5A]/10 px-4 py-2"
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          <Text className="text-sm font-semibold text-[#6FDFB8]">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
