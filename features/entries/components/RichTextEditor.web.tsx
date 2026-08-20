import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import type { Editor } from '@tiptap/core';
import { useThemeColors } from '@/store/uiStore';
import {
  createReferenceId,
  editorContentForDocument,
  toV2Document,
} from '../editor-document';
import type {
  EntryGoalOption,
  IntelligenceReferenceAction,
  RichTextDocument,
} from '../types';
import { uploadNoteImage } from '../services/note-image-service';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import {
  GoalCardNode,
  GoalReferenceMark,
  IntelligenceReferenceMark,
  NoteImageNode,
  StableNodeId,
} from './editor-extensions.web';

type SavedSelection = { from: number; to: number };
type ReferenceKind = 'goal' | 'intelligence';
type ReferenceMenu = {
  id: string;
  kind: ReferenceKind;
  left: number;
  top: number;
};

export interface RichTextEditorProps {
  document: RichTextDocument;
  entryId: string;
  goals: EntryGoalOption[];
  focusedReferenceId?: string | null;
  referenceRemoval?: { id: string; nonce: number } | null;
  onChange: (document: RichTextDocument, plainText: string) => void;
  onIntelligenceReferenceCreated?: (referenceId: string) => void;
  onReferenceActivated?: (referenceId: string, kind: 'goal' | 'intelligence') => void;
  onReferenceRemoved?: (referenceId: string) => void;
  placeholder?: string;
}

const ASK_ACTIONS: Array<{ action: IntelligenceReferenceAction; label: string }> = [
  { action: 'ask', label: 'Ask about this' },
  { action: 'reflect', label: 'Reflect on this' },
  { action: 'understand', label: 'Help me understand this' },
  { action: 'connect_goal', label: 'Connect this to my goal' },
  { action: 'pattern', label: 'Identify a pattern' },
  { action: 'custom', label: 'Custom question…' },
];

function currentReferenceRange(editor: Editor, saved: SavedSelection) {
  const { doc } = editor.state;
  const from = Math.min(saved.from, doc.content.size);
  const to = Math.min(saved.to, doc.content.size);
  const $from = doc.resolve(from);
  let blockId: string | null = null;
  let sourceType: 'text' | 'paragraph' | 'checkbox' = from === to ? 'paragraph' : 'text';
  let range = { from, to };
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (!blockId && typeof node.attrs.id === 'string') blockId = node.attrs.id;
    if (node.type.name === 'taskItem') {
      sourceType = 'checkbox';
      if (typeof node.attrs.id === 'string') blockId = node.attrs.id;
    }
    if (from === to && node.isTextblock) {
      range = { from: $from.start(depth), to: $from.end(depth) };
      break;
    }
  }
  if (range.from === range.to) return null;
  return { ...range, blockId, sourceType };
}

function findReference(editor: Editor, referenceId: string): SavedSelection | null {
  let result: SavedSelection | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (result) return false;
    const matches = node.marks.some((mark) => mark.attrs.referenceId === referenceId);
    if (matches) result = { from: pos, to: pos + node.nodeSize };
    if (node.attrs.referenceId === referenceId) result = { from: pos, to: pos + node.nodeSize };
    return !result;
  });
  return result;
}

function findReferenceAttributes(
  editor: Editor,
  referenceId: string,
  markType: 'goalReference' | 'intelligenceReference',
): Record<string, unknown> | null {
  let result: Record<string, unknown> | null = null;
  editor.state.doc.descendants((node) => {
    const mark = node.marks.find((candidate) => (
      candidate.type.name === markType && candidate.attrs.referenceId === referenceId
    ));
    if (mark) result = { ...mark.attrs };
    return !result;
  });
  return result;
}

function ToolButton({
  label,
  active,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      className={`ohara-editor-tool${active ? ' is-active' : ''}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  document,
  entryId,
  goals,
  focusedReferenceId,
  referenceRemoval,
  onChange,
  onIntelligenceReferenceCreated,
  onReferenceActivated,
  onReferenceRemoved,
  placeholder = 'Start writing…',
}: RichTextEditorProps) {
  const colors = useThemeColors();
  const [menu, setMenu] = useState<'alignment' | 'goal' | 'ask' | 'more' | null>(null);
  const [goalMode, setGoalMode] = useState<'reference' | 'card'>('reference');
  const [progressEvidence, setProgressEvidence] = useState(false);
  const [editingGoalReferenceId, setEditingGoalReferenceId] = useState<string | null>(null);
  const [referenceMenu, setReferenceMenu] = useState<ReferenceMenu | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const savedSelection = useRef<SavedSelection>({ from: 1, to: 1 });
  const lastEmittedDocument = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const initialContent = useMemo(() => editorContentForDocument(document), []);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right'] }),
      Placeholder.configure({ placeholder }),
      StableNodeId.configure({
        types: ['paragraph', 'heading', 'listItem', 'taskItem', 'goalCard', 'noteImage'],
      }),
      GoalReferenceMark,
      IntelligenceReferenceMark,
      GoalCardNode,
      NoteImageNode,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'ohara-rich-editor',
        role: 'textbox',
        'aria-label': 'Note content',
        'aria-multiline': 'true',
      },
      handleClick: (_view, _pos, event) => {
        const element = event.target instanceof Element ? event.target : null;
        const intelligenceElement = element?.closest('[data-intelligence-reference]');
        const goalElement = element?.closest('[data-goal-reference]');
        const intelligence = intelligenceElement?.getAttribute('data-intelligence-reference');
        const goal = goalElement?.getAttribute('data-goal-reference');
        const referenceElement = intelligenceElement ?? goalElement;
        const referenceId = intelligence ?? goal;
        const kind: ReferenceKind | null = intelligence ? 'intelligence' : goal ? 'goal' : null;
        if (referenceElement && referenceId && kind) {
          const bounds = referenceElement.getBoundingClientRect();
          const popoverWidth = 260;
          setReferenceMenu({
            id: referenceId,
            kind,
            left: Math.max(12, Math.min(bounds.left, globalThis.innerWidth - popoverWidth - 12)),
            top: Math.min(bounds.bottom + 8, globalThis.innerHeight - 220),
          });
          onReferenceActivated?.(referenceId, kind);
        }
        return false;
      },
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return false;
        const element = event.target instanceof Element ? event.target : null;
        const intelligenceElement = element?.closest('[data-intelligence-reference]');
        const goalElement = element?.closest('[data-goal-reference]');
        const referenceElement = intelligenceElement ?? goalElement;
        const referenceId = intelligenceElement?.getAttribute('data-intelligence-reference')
          ?? goalElement?.getAttribute('data-goal-reference');
        const kind: ReferenceKind | null = intelligenceElement
          ? 'intelligence'
          : goalElement ? 'goal' : null;
        if (!referenceElement || !referenceId || !kind) return false;
        event.preventDefault();
        const bounds = referenceElement.getBoundingClientRect();
        setReferenceMenu({
          id: referenceId,
          kind,
          left: Math.max(12, Math.min(bounds.left, globalThis.innerWidth - 272)),
          top: Math.min(bounds.bottom + 8, globalThis.innerHeight - 220),
        });
        onReferenceActivated?.(referenceId, kind);
        return true;
      },
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      savedSelection.current = {
        from: nextEditor.state.selection.from,
        to: nextEditor.state.selection.to,
      };
    },
    onUpdate: ({ editor: nextEditor }) => {
      const nextDocument = toV2Document(
        nextEditor.getJSON() as { type?: string; content?: import('../types').RichTextNode[] },
      );
      lastEmittedDocument.current = JSON.stringify(nextDocument);
      onChange(
        nextDocument,
        nextEditor.getText({ blockSeparator: '\n' }),
      );
    },
  });

  useEffect(() => {
    if (!editor) return;
    const serialized = JSON.stringify(document);
    if (serialized === lastEmittedDocument.current) return;
    const current = JSON.stringify(toV2Document(
      editor.getJSON() as { type?: string; content?: import('../types').RichTextNode[] },
    ));
    if (serialized === current) return;
    editor.commands.setContent(editorContentForDocument(document), false);
  }, [document, editor]);

  useEffect(() => {
    if (!editor || !focusedReferenceId) return;
    const range = findReference(editor, focusedReferenceId);
    if (range) editor.chain().focus().setTextSelection(range).scrollIntoView().run();
  }, [editor, focusedReferenceId]);

  useEffect(() => {
    if (!editor) return;
    const referenceId = referenceMenu?.id ?? focusedReferenceId;
    const referenceElements = editor.view.dom.querySelectorAll<HTMLElement>(
      '[data-goal-reference], [data-intelligence-reference]',
    );
    referenceElements.forEach((element) => {
      const matches = referenceId && (
        element.dataset.goalReference === referenceId
        || element.dataset.intelligenceReference === referenceId
      );
      element.classList.toggle('is-reference-focused', !!matches);
    });
    return () => referenceElements.forEach((element) => {
      element.classList.remove('is-reference-focused');
    });
  }, [editor, focusedReferenceId, referenceMenu?.id]);

  useEffect(() => {
    if (!referenceMenu) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReferenceMenu(null);
    };
    globalThis.addEventListener('keydown', handleEscape);
    return () => globalThis.removeEventListener('keydown', handleEscape);
  }, [referenceMenu]);

  useEffect(() => {
    if (!editor || !referenceRemoval) return;
    const range = findReference(editor, referenceRemoval.id);
    if (!range) {
      onReferenceRemoved?.(referenceRemoval.id);
      return;
    }
    const node = editor.state.doc.nodeAt(range.from);
    if (node?.attrs.referenceId === referenceRemoval.id) {
      editor.chain().focus().deleteRange(range).run();
    } else {
      editor.chain()
        .focus()
        .setTextSelection(range)
        .unsetMark('goalReference')
        .unsetMark('intelligenceReference')
        .run();
    }
    onReferenceRemoved?.(referenceRemoval.id);
  }, [editor, onReferenceRemoved, referenceRemoval]);

  const restoreSelection = useCallback(() => {
    if (!editor) return editor;
    editor.commands.setTextSelection(savedSelection.current);
    return editor;
  }, [editor]);

  if (!editor) return <div className="ohara-editor-loading">Preparing editor…</div>;

  const blockActive = (level?: 1 | 2 | 3) => level
    ? editor.isActive('heading', { level })
    : editor.isActive('paragraph');
  const styleLabel = ([1, 2, 3] as const).find((level) => blockActive(level));
  const setBlock = (value: string) => {
    restoreSelection();
    if (value === 'paragraph') editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level: Number(value) as 1 | 2 | 3 }).run();
  };

  const updateReference = (
    referenceId: string,
    markType: 'goalReference' | 'intelligenceReference',
    updates: Record<string, unknown>,
  ) => {
    const range = findReference(editor, referenceId);
    const attributes = findReferenceAttributes(editor, referenceId, markType);
    if (!range || !attributes) return false;
    editor.chain()
      .focus()
      .setTextSelection(range)
      .setMark(markType, { ...attributes, ...updates })
      .setTextSelection({ from: range.to, to: range.to })
      .run();
    return true;
  };

  const removeReference = (
    referenceId: string,
    markType: 'goalReference' | 'intelligenceReference',
  ) => {
    const range = findReference(editor, referenceId);
    if (!range) return;
    editor.chain()
      .focus()
      .setTextSelection(range)
      .unsetMark(markType)
      .setTextSelection({ from: range.to, to: range.to })
      .run();
    setReferenceMenu(null);
    onReferenceRemoved?.(referenceId);
  };

  const editLink = () => {
    restoreSelection();
    const current = String(editor.getAttributes('link').href ?? '');
    const url = globalThis.prompt?.('Link URL (leave blank to remove)', current);
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    let normalized = url.trim();
    if (!/^(https?:|mailto:)/i.test(normalized)) normalized = `https://${normalized}`;
    try {
      new URL(normalized.replace(/^mailto:/, 'https://'));
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
    } catch {
      setMessage('Enter a valid web or email address.');
    }
  };

  const addGoal = (goalId: string) => {
    setMessage(null);
    if (goalMode === 'card') {
      restoreSelection()?.chain().focus().insertGoalCard({
        goalId,
        referenceId: createReferenceId('goal-ref'),
        createdAt: new Date().toISOString(),
      }).run();
      setMenu(null);
      return;
    }
    if (editingGoalReferenceId) {
      updateReference(editingGoalReferenceId, 'goalReference', {
        goalId,
        progressEvidence,
      });
      setEditingGoalReferenceId(null);
      setMenu(null);
      setProgressEvidence(false);
      return;
    }
    const range = currentReferenceRange(editor, savedSelection.current);
    if (!range) {
      setMessage('Select text or place the cursor in a non-empty paragraph first.');
      return;
    }
    editor.chain().focus().setTextSelection(range).setMark('goalReference', {
      referenceId: createReferenceId('goal-ref'),
      goalId,
      blockId: range.blockId,
      sourceType: range.sourceType,
      createdAt: new Date().toISOString(),
      progressEvidence,
    }).setTextSelection({ from: range.to, to: range.to }).run();
    setMenu(null);
    setProgressEvidence(false);
  };

  const askOhara = (action: IntelligenceReferenceAction) => {
    const range = currentReferenceRange(editor, savedSelection.current);
    if (!range) {
      setMessage('Select a passage or place the cursor in a non-empty paragraph first.');
      return;
    }
    const question = action === 'custom'
      ? globalThis.prompt?.('What would you like OHARA to focus on?')?.trim() || null
      : null;
    if (action === 'custom' && !question) return;
    const referenceId = createReferenceId('ohara-ref');
    editor.chain().focus().setTextSelection(range).setMark('intelligenceReference', {
      referenceId,
      blockId: range.blockId,
      createdAt: new Date().toISOString(),
      action,
      question,
      goalIds: [],
    }).setTextSelection({ from: range.to, to: range.to }).run();
    setMenu(null);
    onIntelligenceReferenceCreated?.(referenceId);
  };

  const insertImage = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const uploaded = await uploadNoteImage(entryId, file);
      restoreSelection()?.chain().focus().insertNoteImage({
        ...uploaded,
        id: createReferenceId('image'),
      }).run();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const separator = <span className="ohara-editor-separator" aria-hidden="true" />;
  const referenceAttributes = referenceMenu
    ? findReferenceAttributes(
      editor,
      referenceMenu.id,
      referenceMenu.kind === 'goal' ? 'goalReference' : 'intelligenceReference',
    )
    : null;
  const referenceGoal = referenceMenu?.kind === 'goal'
    ? goals.find((goal) => goal.id === referenceAttributes?.goalId)
    : null;
  return (
    <div
      className="ohara-editor-shell"
      style={{
        '--ohara-editor-accent': colors.accent.primary,
        '--ohara-editor-secondary': colors.text.secondary,
        '--ohara-editor-primary': colors.text.primary,
        '--ohara-editor-border': colors.border.divider,
        '--ohara-editor-surface': colors.background.card,
        '--ohara-editor-selected': colors.background.selectedRow,
        '--ohara-editor-workspace': colors.background.page,
        '--ohara-editor-page': colors.background.card,
        '--ohara-editor-page-border': colors.border.input,
        '--ohara-editor-marker': colors.text.secondary,
        '--ohara-editor-checkbox-border': colors.text.secondary,
        '--ohara-editor-checkbox-check': colors.text.onAccent,
        '--ohara-editor-shadow': colors.effects.shadow,
      } as CSSProperties}
    >
      <div className="ohara-editor-toolbar" role="toolbar" aria-label="Note formatting">
        <select
          aria-label="Text style"
          className="ohara-editor-style-select"
          title="Text style"
          value={styleLabel ? String(styleLabel) : 'paragraph'}
          onFocus={() => { savedSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to }; }}
          onChange={(event) => setBlock(event.target.value)}
        >
          <option value="paragraph">Normal text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        {separator}
        <ToolButton label="Bold (⌘/Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolButton>
        <ToolButton label="Italic (⌘/Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolButton>
        <ToolButton label="Underline (⌘/Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolButton>
        <ToolButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolButton>
        {separator}
        <ToolButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><Ionicons name="list-outline" color="currentColor" size={19} /></ToolButton>
        <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><Ionicons name="list-circle-outline" color="currentColor" size={19} /></ToolButton>
        <ToolButton label="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><Ionicons name="checkbox-outline" color="currentColor" size={19} /></ToolButton>
        <div className="ohara-editor-menu-wrap">
          <ToolButton label="Alignment" active={editor.isActive({ textAlign: 'center' }) || editor.isActive({ textAlign: 'right' })} onClick={() => setMenu(menu === 'alignment' ? null : 'alignment')}><Ionicons name="reorder-three-outline" color="currentColor" size={19} /></ToolButton>
          {menu === 'alignment' ? <div className="ohara-editor-popover compact" role="menu">
            {(['left', 'center', 'right'] as const).map((alignment) => <button type="button" role="menuitem" key={alignment} className={editor.isActive({ textAlign: alignment }) ? 'is-active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => { editor.chain().focus().setTextAlign(alignment).run(); setMenu(null); }}>{alignment[0].toUpperCase() + alignment.slice(1)}</button>)}
          </div> : null}
        </div>
        {separator}
        <ToolButton label={editor.isActive('link') ? 'Edit link' : 'Insert link'} active={editor.isActive('link')} onClick={editLink}><Ionicons name="link-outline" color="currentColor" size={19} /></ToolButton>
        <ToolButton label="Insert image" disabled={uploading} onClick={() => fileInput.current?.click()}><Ionicons name="image-outline" color="currentColor" size={19} /></ToolButton>
        <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => void insertImage(event.target.files?.[0] ?? null)} />
        <div className="ohara-editor-menu-wrap">
          <ToolButton label="Link selection to Goal" active={menu === 'goal'} onClick={() => { setEditingGoalReferenceId(null); setGoalMode('reference'); setMenu(menu === 'goal' ? null : 'goal'); }}><Ionicons name="flag-outline" color="currentColor" size={19} /></ToolButton>
          {menu === 'goal' ? <div className="ohara-editor-popover goal" role="dialog" aria-label="Link to Goal">
            {editingGoalReferenceId ? <span className="ohara-editor-popover-heading">Change linked Goal</span> : <div className="ohara-editor-popover-tabs">
              <button type="button" className={goalMode === 'reference' ? 'is-active' : ''} onClick={() => setGoalMode('reference')}>Link selection</button>
              <button type="button" className={goalMode === 'card' ? 'is-active' : ''} onClick={() => setGoalMode('card')}>Insert Goal</button>
            </div>}
            {goalMode === 'reference' ? <label className="ohara-editor-check-option"><input type="checkbox" checked={progressEvidence} onChange={(event) => setProgressEvidence(event.target.checked)} /> Mark as progress evidence</label> : null}
            <div className="ohara-editor-goal-list">
              {goals.length ? goals.map((goal) => <button type="button" key={goal.id} onClick={() => addGoal(goal.id)}><strong>{goal.title}</strong><span>{goal.category} · {goal.status}</span></button>) : <span className="ohara-editor-empty">No active Goals available.</span>}
            </div>
          </div> : null}
        </div>
        <div className="ohara-editor-menu-wrap">
          <ToolButton label="Ask OHARA about selection" active={menu === 'ask'} onClick={() => setMenu(menu === 'ask' ? null : 'ask')}><Ionicons name="sparkles-outline" color="currentColor" size={19} /></ToolButton>
          {menu === 'ask' ? <div className="ohara-editor-popover" role="menu" aria-label="Ask OHARA actions">
            {ASK_ACTIONS.map((item) => <button type="button" role="menuitem" key={item.action} onClick={() => askOhara(item.action)}>{item.label}</button>)}
            <span className="ohara-editor-premium-note">Creates a stable reference. AI analysis is not run yet.</span>
          </div> : null}
        </div>
        <div className="ohara-editor-menu-wrap">
          <ToolButton label="More editing tools" active={menu === 'more'} onClick={() => setMenu(menu === 'more' ? null : 'more')}><Ionicons name="ellipsis-horizontal" color="currentColor" size={19} /></ToolButton>
          {menu === 'more' ? <div className="ohara-editor-popover compact" role="menu">
            <button type="button" role="menuitem" disabled={!editor.can().chain().focus().undo().run()} onClick={() => { editor.chain().focus().undo().run(); setMenu(null); }}>Undo <span>⌘Z</span></button>
            <button type="button" role="menuitem" disabled={!editor.can().chain().focus().redo().run()} onClick={() => { editor.chain().focus().redo().run(); setMenu(null); }}>Redo <span>⇧⌘Z</span></button>
            <button type="button" role="menuitem" onClick={() => { editor.chain().focus().toggleBlockquote().run(); setMenu(null); }}>Quote</button>
          </div> : null}
        </div>
      </div>
      {message ? <div className="ohara-editor-message" role="status">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button></div> : null}
      <EditorContent editor={editor} className="ohara-editor-content" />
      {referenceMenu && referenceAttributes ? (
        <div
          aria-label={referenceMenu.kind === 'goal' ? 'Goal Reference actions' : 'OHARA Intelligence Reference actions'}
          className="ohara-reference-popover"
          role="menu"
          style={{ left: referenceMenu.left, top: referenceMenu.top }}
        >
          <div className="ohara-reference-popover-summary">
            <strong>{referenceMenu.kind === 'goal' ? referenceGoal?.title ?? 'Goal unavailable' : 'OHARA Intelligence'}</strong>
            <span>{referenceMenu.kind === 'goal'
              ? `${referenceGoal?.category ?? 'Unavailable'} · ${referenceAttributes.progressEvidence ? 'Progress evidence' : 'Reference only'}`
              : String(referenceAttributes.question ?? 'Focused note reference')}</span>
          </div>
          {referenceMenu.kind === 'goal' ? (
            <>
              <button type="button" role="menuitem" disabled={!referenceGoal} onClick={() => {
                if (referenceGoal) router.push(goalWorkspaceHref(referenceGoal.id) as never);
                setReferenceMenu(null);
              }}>Open Goal</button>
              <button type="button" role="menuitem" onClick={() => {
                const range = findReference(editor, referenceMenu.id);
                if (range) savedSelection.current = range;
                setEditingGoalReferenceId(referenceMenu.id);
                setProgressEvidence(referenceAttributes.progressEvidence === true);
                setGoalMode('reference');
                setReferenceMenu(null);
                setMenu('goal');
              }}>Change Goal</button>
              <button type="button" role="menuitem" onClick={() => {
                updateReference(referenceMenu.id, 'goalReference', {
                  progressEvidence: referenceAttributes.progressEvidence !== true,
                });
                setReferenceMenu(null);
              }}>Progress evidence: {referenceAttributes.progressEvidence === true ? 'On' : 'Off'}</button>
              <button className="is-destructive" type="button" role="menuitem" onClick={() => removeReference(referenceMenu.id, 'goalReference')}>Remove Goal Link</button>
            </>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={() => {
                onReferenceActivated?.(referenceMenu.id, 'intelligence');
                setReferenceMenu(null);
              }}>Open in Intelligence</button>
              <button type="button" role="menuitem" onClick={() => {
                const question = globalThis.prompt?.(
                  'What should OHARA focus on?',
                  String(referenceAttributes.question ?? ''),
                );
                if (question !== null) updateReference(referenceMenu.id, 'intelligenceReference', {
                  question: question.trim() || null,
                });
                setReferenceMenu(null);
              }}>Edit question/context</button>
              <button className="is-destructive" type="button" role="menuitem" onClick={() => removeReference(referenceMenu.id, 'intelligenceReference')}>Remove Reference</button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
