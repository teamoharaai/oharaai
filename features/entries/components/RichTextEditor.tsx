import { TextInput, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { isV2Document } from '../editor-document';
import type { RichTextDocument, RichTextNode } from '../types';
import { documentToPlainText } from '../utils';

function isPlainV2Document(document: RichTextDocument): boolean {
  if (!isV2Document(document)) return false;
  return (document.content ?? []).every((node) => (
    node.type === 'paragraph'
    && (!node.attrs?.textAlign || node.attrs.textAlign === 'left')
    && (node.content ?? []).every((child) => child.type === 'text' && !child.marks?.length)
  ));
}

function nativeNodeId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `native-node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function plainV2Document(text: string, previous: RichTextDocument): RichTextDocument {
  const previousParagraphs = isV2Document(previous) ? previous.content ?? [] : [];
  const content: RichTextNode[] = text.split('\n').map((line, index) => ({
    type: 'paragraph',
    attrs: {
      id: typeof previousParagraphs[index]?.attrs?.id === 'string'
        ? previousParagraphs[index].attrs.id
        : nativeNodeId(),
    },
    ...(line ? { content: [{ type: 'text', text: line }] } : {}),
  }));
  return { type: 'doc', schemaVersion: 2, content };
}

export function RichTextEditor({
  document,
  onChange,
  placeholder = 'Start writing…',
}: {
  document: RichTextDocument;
  entryId?: string;
  goals?: import('../types').EntryGoalOption[];
  focusedReferenceId?: string | null;
  referenceRemoval?: { id: string; nonce: number } | null;
  onChange: (document: RichTextDocument, plainText: string) => void;
  onIntelligenceReferenceCreated?: (referenceId: string) => void;
  onReferenceActivated?: (referenceId: string, kind: 'goal' | 'intelligence') => void;
  onReferenceRemoved?: (referenceId: string) => void;
  placeholder?: string;
}) {
  const colors = useThemeColors();
  const plainText = documentToPlainText(document);
  const richV2 = isV2Document(document) && !isPlainV2Document(document);

  function update(text: string) {
    if (isV2Document(document)) {
      onChange(plainV2Document(text, document), text);
      return;
    }
    const block = document.blocks?.[0] ?? {
      id: nativeNodeId(),
      type: 'paragraph' as const,
      text: plainText,
    };
    onChange({ type: 'doc', blocks: [{ ...block, text, html: undefined }] }, text);
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {richV2 ? (
        <View style={{
          backgroundColor: colors.background.card,
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}>
          <Typography variant="meta">
            This rich note is read-only on native for now. Open it on web to edit without losing formatting or references.
          </Typography>
        </View>
      ) : null}
      <TextInput
        accessibilityLabel="Note content"
        editable={!richV2}
        multiline
        onChangeText={update}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        style={{
          color: colors.text.primary,
          flex: 1,
          fontFamily: 'Inter-Regular',
          fontSize: 18,
          lineHeight: 30,
          minHeight: 420,
          opacity: richV2 ? 0.82 : 1,
          paddingHorizontal: 32,
          paddingTop: 40,
          textAlignVertical: 'top',
        }}
        value={plainText}
      />
    </View>
  );
}
