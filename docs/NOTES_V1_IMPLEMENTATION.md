# OHARA Notes Version 1.0

## Scope

OHARA Notes Version 1.0 is the focused document-writing surface for OHARA. It provides familiar document formatting, structured checklists, private images, granular Goal context, and stable OHARA Intelligence references without turning Notes into a page-layout or task-management application.

The release preserves note titles, library behavior, note-level Goal relationships, Echo navigation, export, deletion, autosave, ownership, and legacy note content.

## Editor architecture

The web editor uses Tiptap 2.27.1 on ProseMirror. Formatting is implemented through editor extensions, schema nodes and marks, transactions, selections, commands, and the built-in history/keymap system. Toolbar controls do not manipulate the DOM directly and `document.execCommand` is no longer used.

The native editor shares the same document contract. Plain V2 paragraphs are editable on native; structurally rich V2 notes are intentionally read-only there until a native rich-text implementation can preserve every node and mark.

## Document schema

The existing `entries.content` JSONB column stores a versioned ProseMirror document:

- `type: "doc"`
- `schemaVersion: 2`
- semantic block nodes such as paragraphs, H1–H3 headings, lists, task items, images, and Goal cards
- inline marks for bold, italic, underline, strikethrough, links, Goal References, and Intelligence References
- stable IDs on referenceable blocks and atom nodes

Legacy block/HTML documents remain readable. They convert to schema V2 only after a real editor transaction; opening a legacy note does not perform a destructive bulk migration or silently rewrite it.

## Lists and checklists

Tiptap StarterKit owns bullet and numbered-list structure, continuation, nesting, exit behavior, paste parsing, and undo/redo. Tailwind Preflight globally resets `ul` and `ol` to `list-style: none`; Notes explicitly restores `disc`, nested `circle`/`square`, and `decimal`/nested-alpha markers inside the editor. Marker color is supplied by a theme-aware semantic variable rather than accidental inheritance.

TaskList and nested TaskItem extensions provide real interactive checkboxes. Notes explicitly removes browser-dependent checkbox appearance and draws a neutral unchecked outline plus a restrained OHARA-green checked state. The checked value remains a task-item attribute in document JSON and participates in editor history and autosave.

Document checkboxes have no Goal or Momentum meaning unless the user deliberately creates a Goal Reference and enables progress evidence.

## Page layout and typography

The formatting toolbar is sticky above the document workspace and visually separate from the page. The editor workspace contains a centered document sheet with:

- 960px maximum sheet width
- approximately 740px readable width at the desktop maximum
- responsive 80–110px desktop horizontal page padding
- 40–64px tablet padding
- 18–28px mobile padding
- 56–72px desktop top padding
- a 1px theme-aware page border, restrained 8px radius, and very light shadow

Body copy is 17px with a 1.65 line height on desktop and 16px/1.6 on compact screens. H1, H2, and H3 retain the existing OHARA hierarchy. Lists, links, selection, placeholders, toolbar states, page/workspace contrast, markers, and checkboxes use semantic light/dark tokens.

## Images

Images upload to the private `note-images` Supabase Storage bucket using owner/note/image paths. Documents store only the durable storage path and alt text. Node views request one-hour signed URLs, preserve aspect ratio, remain within the writing column, and provide selected/hover actions for left, center, right, and deletion. Upload and deletion are normal editor transactions and therefore support history and autosave.

Removing an image from a note currently removes the document node; background orphan-object cleanup is a documented future maintenance task.

## Goal References and progress evidence

Lightweight Goal References are `goalReference` marks, separate from note-level Goal relationships and embedded Goal cards. A reference records:

- reference and Goal IDs
- stable block ID
- source type (`text`, `paragraph`, or `checkbox`)
- creation timestamp
- progress-evidence intent
- derived checklist completion state

Clicking or keyboard-activating a reference opens a contextual menu with Open Goal, Change Goal, progress-evidence settings, and Remove Goal Link. Changing or removing a mark preserves source text, paragraph structure, and checklist state. The Intelligence panel also supports jump, Goal navigation, and removal.

Migration 042 makes the saved document canonical for progress evidence. The server verifies the marked reference exists in the saved note, derives checkbox completion from its task item, records only explicit false-to-true completion transitions, and removes the current evidence mapping when the reference disappears. Immutable historical events and published Momentum snapshots are not rewritten. Notes never calculates or writes Momentum scores.

Embedded Goal cards remain deliberate block nodes and store only a Goal ID/reference ID. They render current Goal title, category, status, and next milestone from the authoritative Goal context, provide Goal navigation, and show an unavailable state when the Goal cannot be loaded.

## OHARA Intelligence References

`intelligenceReference` marks store the selected excerpt association, stable block ID, timestamp, action, optional question, and linked Goal context. Inline markers and the Intelligence panel navigate bidirectionally. Inline activation offers Open in Intelligence, Edit question/context, and Remove Reference; panel items provide jump and removal controls.

Removing a reference removes only the document mark. Source text, surrounding marks such as external links, and unrelated future Intelligence history remain intact. No AI call or fabricated analysis is produced in Version 1.0; interpretation and cross-note synthesis remain premium/future capabilities.

## Autosave and compatibility

Notes retains the 900ms debounced autosave, Saving/Saved/error UI, retry behavior, navigation-time save attempt, and local unsaved-draft recovery. Formatting, list/checklist changes, alignment, images, cards, and reference changes all emit document transactions and therefore mark the note dirty.

Updates carry the expected `content_version`. `save_entry_v2` locks and compares the current version before saving the document, relationships, and progress evidence atomically. Conflicts return HTTP 409 rather than overwriting another session.

## Responsive behavior

- Desktop keeps the document sheet centered with an optional right Intelligence rail.
- Tablet reduces page padding and horizontally scrolls the compact toolbar.
- Mobile uses 18–28px page padding and presents Intelligence as the existing sheet/modal.
- Reference actions move to a bottom-width popover on compact web layouts.
- Native touch selection is not covered by custom overlays; rich V2 content is protected from flattening.

## Temporary internal release modal

The internal “What’s New” modal is integrated once at the root authentication lifecycle, not inside Notes routes.

- Feature flag and release content: `config/internal-release.ts`
- Lifecycle guard: `features/auth/internal-release.ts`
- Dialog UI: `components/layout/InternalReleaseNotesModal.tsx`
- Integration point: `app/_layout.tsx`

The modal reacts only to `SIGNED_IN`, marks the release in `sessionStorage`, ignores initial-session restoration, token refreshes, rerenders, route changes, and focus events, and clears the guard on `SIGNED_OUT`. It therefore returns after an explicit logout and login. Set `SHOW_INTERNAL_RELEASE_NOTES` to `false` to disable it without changing auth or route code.

The dialog supports a labeled close control, backdrop dismissal, Escape, initial focus, Tab focus containment on web, focus restoration, screen-reader title association, light/dark themes, and narrow layouts.

## Known limitations

- Migration 042 must be deployed before hosted V2 saves, private image uploads, and reload validation can succeed.
- Full native rich-text editing parity is not included; rich V2 notes are data-safe and read-only on native.
- Deleting an image node does not yet garbage-collect the stored object.
- Live OHARA Intelligence responses and cross-note synthesis remain future/premium work.
- OHARA Notes Version 1.0 intentionally omits justify, tables, arbitrary fonts/sizes/colors, highlights, cropping, text wrapping, and page-layout simulation.
