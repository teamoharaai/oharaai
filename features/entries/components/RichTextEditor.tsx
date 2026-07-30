import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type { RichTextDocument } from '../types';

const MARKS = [
  { label: 'Bold', prefix: '**', suffix: '**', icon: 'text-outline' },
  { label: 'Italic', prefix: '_', suffix: '_', icon: 'create-outline' },
  { label: 'Underline', prefix: '__', suffix: '__', icon: 'remove-outline' },
  { label: 'Strikethrough', prefix: '~~', suffix: '~~', icon: 'remove-circle-outline' },
  { label: 'Bulleted list', prefix: '• ', suffix: '', icon: 'list-outline' },
  { label: 'Numbered list', prefix: '1. ', suffix: '', icon: 'list-circle-outline' },
  { label: 'Checklist', prefix: '☐ ', suffix: '', icon: 'checkbox-outline' },
  { label: 'Quote', prefix: '“', suffix: '”', icon: 'chatbox-outline' },
] as const;

export function RichTextEditor({
  document,
  onChange,
  placeholder = 'Start writing…',
}: {
  document: RichTextDocument;
  onChange: (document: RichTextDocument, plainText: string) => void;
  placeholder?: string;
}) {
  const colors = useThemeColors();
  const block = document.blocks[0] ?? {
    id: `block-${Date.now()}`,
    type: 'paragraph' as const,
    text: '',
  };

  function update(text: string) {
    onChange({ type: 'doc', blocks: [{ ...block, text, html: undefined }] }, text);
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', gap: 4, paddingHorizontal: 16 }}
        style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexGrow: 0 }}
      >
        {([
          ['paragraph', 'Text'],
          ['heading', 'H1'],
          ['subheading', 'H2'],
        ] as const).map(([type, label]) => (
          <Pressable
            accessibilityLabel={label === 'Text' ? 'Normal text' : label}
            accessibilityRole="button"
            key={type}
            onPress={() => onChange({
              type: 'doc',
              blocks: [{ ...block, type }],
            }, block.text)}
            style={({ pressed }) => ({
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
              paddingHorizontal: 9,
            })}
          >
            <Typography variant="caption">{label}</Typography>
          </Pressable>
        ))}
        {MARKS.map((mark) => (
          <Pressable
            accessibilityLabel={mark.label}
            accessibilityRole="button"
            key={mark.label}
            onPress={() => update(`${mark.prefix}${block.text}${mark.suffix}`)}
            style={({ pressed }) => ({
              alignItems: 'center',
              height: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
              width: 42,
            })}
          >
            <Ionicons name={mark.icon} color={colors.text.secondary} size={18} />
          </Pressable>
        ))}
      </ScrollView>
      <TextInput
        accessibilityLabel="Note content"
        multiline
        onChangeText={update}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        style={{
          color: colors.text.primary,
          flex: 1,
          fontFamily: 'Inter-Regular',
          fontSize: 16,
          lineHeight: 28,
          minHeight: 420,
          paddingHorizontal: 24,
          paddingTop: 36,
          textAlignVertical: 'top',
        }}
        value={block.text}
      />
    </View>
  );
}
