import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type { RichTextDocument } from '../types';

const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'DIV', 'EM', 'H1', 'H2', 'I', 'LI',
  'OL', 'P', 'S', 'STRIKE', 'STRONG', 'U', 'UL',
]);

function sanitizeHtml(raw: string): string {
  if (typeof globalThis.document === 'undefined') return '';
  const template = globalThis.document.createElement('template');
  template.innerHTML = raw;
  for (const element of Array.from(template.content.querySelectorAll('*'))) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (element.tagName === 'A' && attribute.name === 'href') {
        if (!/^(https?:|mailto:)/i.test(attribute.value)) element.removeAttribute('href');
      } else if (
        attribute.name === 'style'
        && /^(DIV|H1|H2|P|BLOCKQUOTE)$/.test(element.tagName)
      ) {
        const alignment = (element as HTMLElement).style.textAlign;
        if (alignment === 'left' || alignment === 'center' || alignment === 'right') {
          element.setAttribute('style', `text-align: ${alignment}`);
        } else {
          element.removeAttribute('style');
        }
      } else {
        element.removeAttribute(attribute.name);
      }
    }
  }
  return template.innerHTML;
}

function initialHtml(document: RichTextDocument): string {
  const block = document.blocks[0];
  if (block?.html) return sanitizeHtml(block.html);
  return document.blocks
    .map((item) => `<p>${item.text.replace(/[&<>]/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
    }[character] ?? character))}</p>`)
    .join('');
}

const TOOLS = [
  { label: 'Undo', icon: 'arrow-undo-outline', command: 'undo', group: 'history' },
  { label: 'Redo', icon: 'arrow-redo-outline', command: 'redo', group: 'history' },
  { label: 'Bold', icon: 'text-outline', command: 'bold', group: 'appearance' },
  { label: 'Italic', icon: 'create-outline', command: 'italic', group: 'appearance' },
  { label: 'Underline', icon: 'remove-outline', command: 'underline', group: 'appearance' },
  { label: 'Strikethrough', icon: 'remove-circle-outline', command: 'strikeThrough', group: 'appearance' },
  { label: 'Bulleted list', icon: 'list-outline', command: 'insertUnorderedList', group: 'lists' },
  { label: 'Numbered list', icon: 'list-circle-outline', command: 'insertOrderedList', group: 'lists' },
  { label: 'Checklist', icon: 'checkbox-outline', command: 'insertText', value: '☐ ', group: 'tasks' },
  { label: 'Quote', icon: 'chatbox-outline', command: 'formatBlock', value: 'blockquote', group: 'insert' },
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
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const html = useMemo(() => initialHtml(document), [document]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (sanitizeHtml(editorRef.current.innerHTML) !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html]);

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    const safeHtml = sanitizeHtml(editor.innerHTML);
    if (safeHtml !== editor.innerHTML) editor.innerHTML = safeHtml;
    const plainText = editor.innerText.replace(/\n{3,}/g, '\n\n').trimEnd();
    onChange({
      type: 'doc',
      blocks: [{
        id: document.blocks[0]?.id ?? `block-${Date.now()}`,
        type: 'paragraph',
        text: plainText,
        html: safeHtml,
      }],
    }, plainText);
  }

  function apply(command: string, value?: string) {
    editorRef.current?.focus();
    globalThis.document.execCommand(command, false, value);
    emitChange();
  }

  function applyBlock(tag: 'p' | 'h1' | 'h2') {
    apply('formatBlock', tag);
  }

  function addLink() {
    const url = globalThis.prompt?.('Paste a secure link');
    if (!url || !/^(https?:|mailto:)/i.test(url)) return;
    apply('createLink', url);
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', gap: 2, paddingHorizontal: 18 }}
        style={{
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          flexGrow: 0,
          minHeight: 56,
        }}
      >
        {(['p', 'h1', 'h2'] as const).map((tag) => (
          <Pressable
            accessibilityLabel={tag === 'p' ? 'Normal text' : tag === 'h1' ? 'Heading' : 'Subheading'}
            accessibilityRole="button"
            key={tag}
            onPress={() => applyBlock(tag)}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderRadius: 8,
              justifyContent: 'center',
              minHeight: 40,
              opacity: pressed ? 0.6 : 1,
              paddingHorizontal: 10,
            })}
          >
            <Typography variant="emphasis-sm" style={{ fontSize: 13 }}>
              {tag === 'p' ? 'Text' : tag === 'h1' ? 'H1' : 'H2'}
            </Typography>
          </Pressable>
        ))}
        {TOOLS.map((tool, index) => (
          <Fragment key={tool.label}>
            {index === 0 || TOOLS[index - 1]?.group !== tool.group ? (
              <View
                accessibilityElementsHidden
                style={{
                  backgroundColor: colors.border.divider,
                  height: 24,
                  marginHorizontal: 6,
                  width: 1,
                }}
              />
            ) : null}
            <Pressable
              accessibilityLabel={tool.label}
              accessibilityRole="button"
              onPress={() => apply(tool.command, 'value' in tool ? tool.value : undefined)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
                borderRadius: 8,
                height: 40,
                justifyContent: 'center',
                opacity: pressed ? 0.72 : 1,
                width: 40,
              })}
            >
              <Ionicons name={tool.icon} color={colors.text.secondary} size={19} />
            </Pressable>
          </Fragment>
        ))}
        <View
          accessibilityElementsHidden
          style={{ backgroundColor: colors.border.divider, height: 24, marginHorizontal: 6, width: 1 }}
        />
        <Pressable
          accessibilityLabel="Insert link"
          accessibilityRole="button"
          onPress={addLink}
          style={({ pressed }) => ({
            alignItems: 'center',
            borderRadius: 8,
            height: 40,
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            width: 40,
          })}
        >
          <Ionicons name="link-outline" color={colors.text.secondary} size={19} />
        </Pressable>
        <Pressable
          accessibilityLabel="More formatting"
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
          onPress={() => setMoreOpen((open) => !open)}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: moreOpen ? colors.background.selectedRow : 'transparent',
            borderRadius: 8,
            height: 40,
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            width: 40,
          })}
        >
          <Ionicons name="ellipsis-horizontal" color={colors.text.secondary} size={19} />
        </Pressable>
        {moreOpen ? ([
          ['Align left', 'reorder-three-outline', 'justifyLeft'],
          ['Align center', 'reorder-two-outline', 'justifyCenter'],
          ['Align right', 'reorder-four-outline', 'justifyRight'],
        ] as const).map(([label, icon, command]) => (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            key={label}
            onPress={() => apply(command)}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderRadius: 8,
              height: 40,
              justifyContent: 'center',
              opacity: pressed ? 0.72 : 1,
              width: 40,
            })}
          >
            <Ionicons name={icon} color={colors.text.secondary} size={19} />
          </Pressable>
        )) : null}
      </ScrollView>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label="Note content"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        suppressContentEditableWarning
        className="ohara-rich-editor"
        style={{
          '--ohara-editor-accent': colors.accent.primary,
          '--ohara-editor-secondary': colors.text.secondary,
          caretColor: colors.accent.primary,
          color: colors.text.primary,
          flex: 1,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Helvetica Neue", Arial, sans-serif',
          fontSize: 18,
          fontWeight: 400,
          lineHeight: 1.65,
          margin: '0 auto',
          maxWidth: 900,
          minHeight: 420,
          outline: 'none',
          overflowY: 'auto',
          padding: 'clamp(40px, 5vw, 64px) 0 120px',
          width: 'calc(100% - clamp(32px, 7vw, 112px))',
        } as CSSProperties}
      />
    </View>
  );
}
