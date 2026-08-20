import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Extension, Mark, mergeAttributes, Node, type CommandProps } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { useEntriesStore } from '../store';
import { createSignedNoteImageUrl } from '../services/note-image-service';
import { goalWorkspaceHref } from '@/features/goals/navigation';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    goalCard: {
      insertGoalCard: (attrs: { goalId: string; referenceId: string; createdAt: string }) => ReturnType;
    };
    noteImage: {
      insertNoteImage: (attrs: { storagePath: string; alt: string; id: string }) => ReturnType;
    };
  }
}

function stableNodeId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `node-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const StableNodeId = Extension.create<{
  types: string[];
}>({
  name: 'stableNodeId',
  addOptions() { return { types: [] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute('data-id'),
          renderHTML: (attributes) => attributes.id ? { 'data-id': attributes.id } : {},
        },
      },
    }];
  },
  onCreate() {
    const transaction = this.editor.state.tr;
    this.editor.state.doc.descendants((node, pos) => {
      if (this.options.types.includes(node.type.name) && !node.attrs.id) {
        transaction.setNodeMarkup(pos, undefined, { ...node.attrs, id: stableNodeId() });
      }
    });
    if (transaction.steps.length) {
      transaction.setMeta('addToHistory', false);
      transaction.setMeta('preventUpdate', true);
      this.editor.view.dispatch(transaction);
    }
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('stableNodeId'),
      appendTransaction: (transactions, _oldState, newState) => {
        if (!transactions.some((transaction) => transaction.docChanged)) return null;
        const transaction = newState.tr;
        const seen = new Set<string>();
        newState.doc.descendants((node, pos) => {
          if (!this.options.types.includes(node.type.name)) return;
          const id = typeof node.attrs.id === 'string' ? node.attrs.id : null;
          if (!id || seen.has(id)) {
            transaction.setNodeMarkup(pos, undefined, { ...node.attrs, id: stableNodeId() });
          } else {
            seen.add(id);
          }
        });
        if (!transaction.steps.length) return null;
        transaction.setMeta('addToHistory', false);
        transaction.setMeta('preventUpdate', true);
        return transaction;
      },
    })];
  },
});

export const GoalReferenceMark = Mark.create({
  name: 'goalReference',
  inclusive: false,
  addAttributes() {
    return {
      referenceId: { default: null },
      goalId: { default: null },
      blockId: { default: null },
      sourceType: { default: 'text' },
      createdAt: { default: null },
      progressEvidence: { default: false },
    };
  },
  parseHTML() { return [{ tag: 'span[data-goal-reference]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'ohara-goal-reference',
      'data-goal-reference': HTMLAttributes.referenceId,
      role: 'button',
      tabindex: '0',
      title: 'Linked to a Goal',
    }), 0];
  },
});

export const IntelligenceReferenceMark = Mark.create({
  name: 'intelligenceReference',
  inclusive: false,
  addAttributes() {
    return {
      referenceId: { default: null },
      blockId: { default: null },
      createdAt: { default: null },
      action: { default: 'ask' },
      question: { default: null },
      goalIds: { default: [] },
    };
  },
  parseHTML() { return [{ tag: 'span[data-intelligence-reference]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'ohara-intelligence-reference',
      'data-intelligence-reference': HTMLAttributes.referenceId,
      role: 'button',
      tabindex: '0',
      title: 'OHARA Intelligence reference',
    }), 0];
  },
});

function GoalCardView({ node, selected, deleteNode }: ReactNodeViewProps) {
  const goalId = String(node.attrs.goalId ?? '');
  const goal = useEntriesStore((state) => state.goals.find((item) => item.id === goalId));
  const nextMilestone = goal?.milestones.find((milestone) => !milestone.completedAt);
  return (
    <NodeViewWrapper
      className={`ohara-goal-card${selected ? ' is-selected' : ''}`}
      data-reference-id={node.attrs.referenceId}
    >
      <div className="ohara-goal-card-mark" aria-hidden="true">◎</div>
      <div className="ohara-goal-card-copy">
        <span className="ohara-goal-card-label">GOAL</span>
        <strong>{goal?.title ?? 'Goal unavailable'}</strong>
        <span>{goal ? `${goal.category} · ${goal.status}` : 'This Goal may have been archived or deleted.'}</span>
        {nextMilestone ? <span>Next: {nextMilestone.title}</span> : null}
      </div>
      {goal ? (
        <button
          type="button"
          aria-label={`Open Goal: ${goal.title}`}
          onClick={() => router.push(goalWorkspaceHref(goal.id) as never)}
        >
          Open
        </button>
      ) : null}
      <button type="button" aria-label="Remove embedded Goal" onClick={deleteNode}>×</button>
    </NodeViewWrapper>
  );
}

export const GoalCardNode = Node.create({
  name: 'goalCard',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      id: { default: null },
      goalId: { default: null },
      referenceId: { default: null },
      createdAt: { default: null },
    };
  },
  parseHTML() { return [{ tag: 'div[data-goal-card]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-goal-card': HTMLAttributes.goalId,
      class: 'ohara-goal-card',
    }), 'Goal reference'];
  },
  addCommands() {
    return {
      insertGoalCard: (attrs) => ({ commands }: CommandProps) => commands.insertContent({
        type: this.name,
        attrs,
      }),
    };
  },
  addNodeView() { return ReactNodeViewRenderer(GoalCardView); },
});

function NoteImageView({ node, selected, deleteNode, updateAttributes }: ReactNodeViewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const storagePath = String(node.attrs.storagePath ?? '');
  useEffect(() => {
    let active = true;
    setError(false);
    void createSignedNoteImageUrl(storagePath)
      .then((url) => { if (active) setSrc(url); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [storagePath]);
  return (
    <NodeViewWrapper
      className={`ohara-note-image align-${node.attrs.align ?? 'center'}${selected ? ' is-selected' : ''}`}
      data-storage-path={storagePath}
    >
      {src && !error
        ? <img src={src} alt={String(node.attrs.alt ?? 'Note image')} />
        : <div className="ohara-note-image-placeholder">{error ? 'Image unavailable' : 'Loading image…'}</div>}
      <div className="ohara-note-image-actions" contentEditable={false}>
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            type="button"
            aria-label={`Align image ${align}`}
            aria-pressed={node.attrs.align === align}
            key={align}
            onClick={() => updateAttributes({ align })}
          >
            {align[0].toUpperCase()}
          </button>
        ))}
        <button type="button" aria-label="Delete image" onClick={deleteNode}>×</button>
      </div>
    </NodeViewWrapper>
  );
}

export const NoteImageNode = Node.create({
  name: 'noteImage',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      id: { default: null },
      storagePath: { default: null },
      alt: { default: 'Note image' },
      align: { default: 'center' },
    };
  },
  parseHTML() { return [{ tag: 'figure[data-note-image]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, {
      'data-note-image': HTMLAttributes.storagePath,
      class: `ohara-note-image align-${HTMLAttributes.align ?? 'center'}`,
    })];
  },
  addCommands() {
    return {
      insertNoteImage: (attrs) => ({ commands }: CommandProps) => commands.insertContent({
        type: this.name,
        attrs,
      }),
    };
  },
  addNodeView() { return ReactNodeViewRenderer(NoteImageView); },
});
