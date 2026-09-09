# OHARA Notes Version 1.1

## Scope and production findings

Notes Version 1.1 is a targeted interaction, reference, icon, and export polish pass on the existing Notes Version 1.0 editor. It preserves the Tiptap/ProseMirror document model, schema V2, autosave, private image storage, Goal progress evidence, Reflections, and the current Momentum architecture.

The production audit used the existing long-form **Momentum Version 1.1 Feedback Notes** document. It reproduced four concrete issues:

- Jump to Source replaced the document selection and delegated scrolling to ProseMirror, leaving the exact reference against the viewport edge instead of centered.
- Repeating a jump to the already selected reference did nothing because its string state had not changed.
- The decorative page, including its generous visual padding, was itself the `contenteditable` root. Clicking the page margin created a non-collapsed browser selection with no selected text.
- PDF export received only the title and flattened plain text, so headings, marks, links, lists, checkboxes, alignment, Goal cards, and both successfully loaded private note images were irretrievably discarded before PDF generation.

The primary formatting toolbar also had no contextual alternative when panel width made the Ask OHARA control inconvenient to reach, and its numbered-list and Goal-reference symbols did not match their intended semantics.

## Jump to Source

Reference navigation resolves the exact stable `data-goal-reference`, `data-intelligence-reference`, or embedded Goal `data-reference-id` value. It never chooses the nearest paragraph, image, or Goal card by approximate layout.

The editor scrolls its actual internal scroll container and centers the exact referenced element within that container's visible height. Because the formatting toolbar is outside that scroll container, its sticky height is naturally excluded from the usable viewport. Reduced-motion preferences are respected.

A restrained semantic-green source emphasis lasts approximately 1.7 seconds and is applied only to the matching reference element. Navigation does not focus the editor, create or replace a text selection, change content, autosave, or recalculate Momentum. A request nonce makes repeated jumps to the same reference reliable. Existing inline reference menus retain their separate focus treatment.

## Decorative page versus editable content

The centered 960px document sheet is now a non-editable `.ohara-editor-page` wrapper. It owns the border, background, responsive padding, minimum visual page height, and shadow. The nested `.ohara-editor-document` and `.ohara-rich-editor` contain only the actual editable writing region.

Decorative page padding uses `user-select: none`; editor content explicitly restores normal text selection. Pointer events that land directly on the decorative page prevent native selection, clear any existing browser selection, and dismiss contextual reference controls without moving the document or changing its content. Real paragraphs, text, images, checkboxes, arrow navigation, keyboard shortcuts, and Shift/mouse text selection remain owned by ProseMirror.

The original desktop, tablet, and mobile document width, typography, horizontal margins, and vertical rhythm remain unchanged when the Intelligence rail opens or closes.

## Contextual OHARA Intelligence references

A compact contextual toolbar appears only when all of the following conditions hold:

1. The ProseMirror range is non-collapsed.
2. The range contains actual non-whitespace document text.
3. The native browser selection is non-collapsed.
4. Both selection endpoints belong to the real editable editor root.
5. The selected range has usable rendered geometry.

The toolbar offers Bold, Italic, Link, Goal Reference, and **Create OHARA Intelligence reference**. The Intelligence action creates a normal `intelligenceReference` mark immediately, preserves the existing panel-open state, and lets the existing canonical document extraction refresh the panel. It performs no AI call or interpretation. Selection synchronization is animation-frame coalesced and does not mark the Note dirty; only real reference creation/removal and ordinary document edits persist.

Existing Goal/Intelligence jump, change, edit, removal, checklist, progress-evidence, and text-preservation behavior remains on the established Version 1.0 paths.

## Selectable-text PDF export

The previous exporter manually wrote one Helvetica text stream from `title + plainText`. Version 1.1 instead traverses the canonical versioned document schema and builds an actual multi-page PDF with vector text, vector checkboxes, link annotations, and embedded JPEG image XObjects. It does not screenshot or rasterize the document.

The dedicated print renderer uses a white page, dark body text, restrained OHARA-green reference accents, standard Letter pages, approximately 58-point horizontal margins, visible page numbers, stable Helvetica Regular/Bold/Oblique/Bold-Oblique variants, the corresponding published Helvetica glyph widths, and document-aware line wrapping and page breaks. Accurate font metrics keep adjacent mixed-style text aligned without overlapping or accumulating artificial gaps. It preserves:

- Note or Reflection title and normal paragraphs.
- H1, H2, and H3 hierarchy.
- Bold, italic, underline, and strikethrough, including combined bold/italic.
- External links as readable, clickable PDF annotations.
- Left, centered, and right-aligned paragraphs/headings.
- Nested bullet and numbered lists with indentation and visible markers.
- Checked and unchecked checklist items using vector-drawn checkbox states.
- Blockquotes, horizontal rules, paragraph spacing, and readable print margins.
- Goal-reference source text with a restrained print-safe accent.
- Embedded Goal cards as the explicit, understandable `Goal: <visible Goal title>` block.
- Intelligence-reference source text without exporting panel controls or invented AI output.
- Smart punctuation supported by the built-in WinAnsi PDF fonts.

Legacy block-based Notes and Reflections still export without any migration or document rewrite.

### Private images

Stored documents retain durable owner-scoped Supabase Storage paths. At export time the existing authenticated storage service creates a fresh signed URL for each unique image, fetches the original bytes, and prepares a bounded JPEG image for embedding directly into the PDF. Small JPEGs are embedded without conversion; larger images and PNG/GIF/WebP inputs are downsampled to a maximum 2,000-pixel dimension and composited over conventional white paper before JPEG encoding.

Images keep their aspect ratio, respect the authored left/center/right alignment and print margins, and are moved to a new page when they cannot fit whole. A missing, expired, unauthorized, or unreadable private image aborts export with an explicit error instead of silently producing a PDF with missing content. Raw/base64 image payloads are never stored in Note content.

### Page breaks

Headings reserve room for following content where possible. List markers and checklist controls are drawn on the same line as their associated source text. Images and Goal-reference blocks are kept intact, and oversized images are proportionally scaled to the available printable page. Ordinary long paragraphs flow naturally across pages, with page numbering added after pagination finishes.

## Icons and navigation

The numbered-list toolbar action now uses a conventional `1.`, `2.`, `3.` symbol with matching horizontal strokes.

The Goal-reference actions reuse the existing shared `BrandIcon name="goals"` asset and theme state. Ordinary hyperlink actions continue to use the chain-link icon.

The primary navigation already consumes the shared `BrandIcon` abstraction. Only Home, Momentum, and Constellation currently have finalized code-native vector components; Goals, Echo, and the OHARA master/Intelligence marks still rely on their established existing assets or sparkles. Because the complete replacement icon family is not available in source, navigation remains deliberately unchanged instead of introducing piecemeal or recreated screenshot icons.

## Internal release message

The existing root-level internal What's New configuration now identifies **OHARA Notes Version 1.1** and summarizes improved reference navigation, open-panel reference creation, cleaner selection, clearer icons, and formatting/image-preserving PDF export. Authentication behavior, modal lifecycle, and dismissal controls are unchanged.

## Runtime acceptance evidence

Acceptance used an authenticated disposable local account and a real 83-node document spanning more than 7,200 pixels of scrollable content. The Note contained three heading levels, combined text marks, left/center/right-aligned paragraphs, bullet/numbered/check lists, both checkbox states, an owner-scoped private image, an embedded Goal, an inline Goal reference, and Intelligence references near the top and bottom of the document.

Real Chrome interaction confirmed exact-reference jumps and transient emphasis, repeat navigation, unchanged 960px page width and 737.98px image width with the Intelligence rail open or closed, source-preserving Goal/Intelligence reference removal, direct margin-click selection dismissal, double-click and Shift/arrow text selection, formatting shortcuts, undo/redo, and correctly themed light/dark pages. Whitespace-only selection did not reveal contextual actions.

An actual 390px Chrome viewport activated the mobile media query, retained 23.4px document margins, preserved a 16px readable editor font, and had exactly 390px of document scroll width without horizontal overflow. Double-clicking real text exposed the compact toolbar; tapping the decorative margin immediately collapsed selection and dismissed that toolbar without changing scroll position. Creating an Intelligence reference from the mobile contextual toolbar opened the existing full-screen Intelligence drawer and synchronized the new reference. A separate 768px tablet viewport activated the established tablet spacing without overflow, and Chrome's normal desktop viewport was restored afterward.

The browser-generated export produced seven standard Letter pages containing selectable text, four real Helvetica font variants, clickable link annotations, and one embedded private-image object. Text extraction verified the title, H1/H2/H3, ordered lists, both checklist labels, all reference source paragraphs, and the readable embedded Goal. Rendering the actual exported pages exposed an initial glyph-spacing discrepancy; switching to exact Helvetica metrics corrected the final visual layout without rasterizing the document.

## Remaining limitations

- Finalized replacement navigation assets for every product surface have not been delivered as reusable source components.
- The built-in PDF fonts cover standard WinAnsi Western punctuation; characters outside that font encoding degrade to `?` until a licensed embedded Unicode font is introduced.
- GIFs export as their current/static decoded image, and transparent assets are intentionally composited over white printable paper.
- Full native rich-text editing remains safely read-only for structurally rich schema-V2 Notes, exactly as in Version 1.0.
- Live OHARA Intelligence responses, RAG, automatic analysis, billing, and image-object garbage collection remain outside the Notes Version 1.1 scope.
