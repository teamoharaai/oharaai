import type { RichTextDocument, RichTextMark, RichTextNode } from './types.ts';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN_X = 58;
const PAGE_MARGIN_TOP = 62;
const PAGE_MARGIN_BOTTOM = 60;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const TEXT_COLOR = '0.145 0.176 0.161';
const MUTED_COLOR = '0.435 0.482 0.455';
const ACCENT_COLOR = '0.208 0.388 0.282';
const LIGHT_COLOR = '0.953 0.969 0.957';
const encoder = new TextEncoder();

// Exact Adobe Base-14 Helvetica advance widths for printable ASCII. PDF text
// stays selectable, and using the real widths prevents adjacent styled runs
// from colliding or accumulating visible gaps across a long line.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
] as const;
const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
] as const;

const WIN_ANSI: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  'ƒ': 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  'ˆ': 0x88,
  '‰': 0x89,
  'Š': 0x8a,
  '‹': 0x8b,
  'Œ': 0x8c,
  'Ž': 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  'š': 0x9a,
  '›': 0x9b,
  'œ': 0x9c,
  'ž': 0x9e,
  'Ÿ': 0x9f,
};

export interface NotePdfImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface NotePdfOptions {
  title: string;
  document?: RichTextDocument;
  plainText?: string;
  goals?: ReadonlyArray<{ id: string; title: string }>;
  loadImage?: (storagePath: string, alt: string) => Promise<NotePdfImage>;
}

interface PdfTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  href?: string;
  goalReference?: boolean;
  intelligenceReference?: boolean;
  size?: number;
  muted?: boolean;
}

interface PdfLineSegment {
  run: PdfTextRun;
  text: string;
  width: number;
}

interface PdfLink {
  href: string;
  rect: [number, number, number, number];
}

interface PdfPage {
  commands: string[];
  links: PdfLink[];
  images: Set<string>;
}

interface BlockContext {
  indent: number;
  marker?: string;
  checked?: boolean;
  quote?: boolean;
}

interface ParagraphOptions extends BlockContext {
  fontSize: number;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
  before: number;
  after: number;
  keepWithNext?: boolean;
}

function number(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function pdfHex(value: string): string {
  return `<${Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    const encoded = code >= 32 && code <= 255 && !(code >= 127 && code <= 159)
      ? code
      : WIN_ANSI[character] ?? 0x3f;
    return encoded.toString(16).padStart(2, '0');
  }).join('')}>`;
}

function pdfLiteral(value: string): string {
  return value.replace(/[\\()]/g, '\\$&').replace(/[\r\n]/g, '');
}

function characterWidth(character: string, bold: boolean): number {
  const index = character.charCodeAt(0) - 32;
  const widths = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  if (index >= 0 && index < widths.length) return (widths[index] ?? 556) / 1000;
  if (character === '•') return 0.35;
  if (character === '—') return 1;
  if (character === '–') return 0.556;
  if (character === '…') return 1;
  if (character === '‘' || character === '’') return 0.222;
  if (character === '“' || character === '”') return 0.333;
  return 0.556;
}

function measureText(text: string, fontSize: number, bold = false): number {
  return Array.from(text).reduce((sum, character) => (
    sum + characterWidth(character, bold) * fontSize
  ), 0);
}

function normalizeNodes(document: RichTextDocument | undefined, plainText = ''): RichTextNode[] {
  if (document?.schemaVersion === 2 && Array.isArray(document.content)) return document.content;
  if (document?.blocks?.length) {
    return document.blocks.map((block) => {
      const headingLevel = block.type === 'heading' ? 1 : block.type === 'subheading' ? 2 : null;
      return {
        type: headingLevel ? 'heading' : 'paragraph',
        ...(headingLevel ? { attrs: { level: headingLevel } } : {}),
        content: block.text ? [{ type: 'text', text: block.text }] : [],
      };
    });
  }
  return plainText.split(/\r?\n/).map((text) => ({
    type: 'paragraph',
    content: text ? [{ type: 'text', text }] : [],
  }));
}

function walkNodes(nodes: RichTextNode[], visit: (node: RichTextNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (node.content?.length) walkNodes(node.content, visit);
  }
}

function mark(markList: RichTextMark[] | undefined, type: string): RichTextMark | undefined {
  return markList?.find((candidate) => candidate.type === type);
}

function textRuns(nodes: RichTextNode[] = []): PdfTextRun[] {
  const runs: PdfTextRun[] = [];
  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      runs.push({ text: '\n' });
      continue;
    }
    if (node.type === 'text') {
      const href = mark(node.marks, 'link')?.attrs?.href;
      runs.push({
        text: node.text ?? '',
        bold: !!mark(node.marks, 'bold'),
        italic: !!mark(node.marks, 'italic'),
        underline: !!mark(node.marks, 'underline'),
        strike: !!mark(node.marks, 'strike'),
        href: typeof href === 'string' ? href : undefined,
        goalReference: !!mark(node.marks, 'goalReference'),
        intelligenceReference: !!mark(node.marks, 'intelligenceReference'),
      });
      continue;
    }
    if (node.content?.length) runs.push(...textRuns(node.content));
  }
  return runs;
}

function lineWidth(line: PdfLineSegment[]): number {
  return line.reduce((sum, segment) => sum + segment.width, 0);
}

function wrapRuns(
  runs: PdfTextRun[],
  availableWidth: number,
  defaultFontSize: number,
  defaultBold: boolean,
): PdfLineSegment[][] {
  const lines: PdfLineSegment[][] = [];
  let current: PdfLineSegment[] = [];

  const flush = () => {
    while (current.at(-1)?.text === ' ') current.pop();
    lines.push(current);
    current = [];
  };

  const pushToken = (run: PdfTextRun, token: string) => {
    const fontSize = run.size ?? defaultFontSize;
    const bold = run.bold || defaultBold;
    if (token === '\n') {
      flush();
      return;
    }
    const text = /^\s+$/.test(token) ? ' ' : token;
    if (text === ' ' && (!current.length || current.at(-1)?.text === ' ')) return;
    const width = measureText(text, fontSize, bold);
    if (lineWidth(current) + width > availableWidth && current.length) {
      flush();
      if (text === ' ') return;
    }
    if (width > availableWidth) {
      for (const character of text) {
        const characterSize = measureText(character, fontSize, bold);
        if (lineWidth(current) + characterSize > availableWidth && current.length) flush();
        current.push({ run, text: character, width: characterSize });
      }
      return;
    }
    current.push({ run, text, width });
  };

  for (const run of runs) {
    for (const token of run.text.match(/\n|[^\S\n]+|[^\s]+/g) ?? []) {
      pushToken(run, token);
    }
  }
  if (current.length || !lines.length) flush();
  return lines;
}

class PdfLayout {
  readonly pages: PdfPage[] = [];

  private readonly imageKeys = new Map<string, string>();

  private readonly goalTitles: Map<string, string>;

  private readonly images: Map<string, NotePdfImage>;

  private cursor = PAGE_HEIGHT - PAGE_MARGIN_TOP;

  constructor(
    goalTitles: Map<string, string>,
    images: Map<string, NotePdfImage>,
  ) {
    this.goalTitles = goalTitles;
    this.images = images;
    this.addPage();
  }

  private get page(): PdfPage {
    return this.pages[this.pages.length - 1] as PdfPage;
  }

  private addPage() {
    this.pages.push({ commands: [], links: [], images: new Set() });
    this.cursor = PAGE_HEIGHT - PAGE_MARGIN_TOP;
  }

  private ensureSpace(height: number): void {
    if (this.cursor - height < PAGE_MARGIN_BOTTOM) this.addPage();
  }

  private drawRun(run: PdfTextRun, text: string, x: number, y: number, size: number, bold = false) {
    const effectiveBold = !!(bold || run.bold);
    const font = effectiveBold && run.italic ? 'F4' : effectiveBold ? 'F2' : run.italic ? 'F3' : 'F1';
    const color = run.href || run.goalReference ? ACCENT_COLOR : run.muted ? MUTED_COLOR : TEXT_COLOR;
    const width = measureText(text, size, effectiveBold);
    this.page.commands.push(
      `BT /${font} ${number(size)} Tf ${color} rg 1 0 0 1 ${number(x)} ${number(y)} Tm ${pdfHex(text)} Tj ET`,
    );
    if (run.underline || run.href || run.goalReference) {
      this.page.commands.push(`${color} RG 0.62 w ${number(x)} ${number(y - 1.6)} m ${number(x + width)} ${number(y - 1.6)} l S`);
    }
    if (run.strike) {
      const strikeY = y + size * 0.31;
      this.page.commands.push(`${color} RG 0.7 w ${number(x)} ${number(strikeY)} m ${number(x + width)} ${number(strikeY)} l S`);
    }
    if (run.href) {
      this.page.links.push({
        href: run.href,
        rect: [x, y - 2, x + width, y + size],
      });
    }
  }

  title(value: string): void {
    this.paragraph([{ text: value || 'Untitled entry', bold: true }], {
      indent: 0,
      fontSize: 27,
      align: 'left',
      bold: true,
      before: 0,
      after: 14,
      keepWithNext: true,
    });
    this.page.commands.push(`0.855 0.882 0.863 RG 0.8 w ${PAGE_MARGIN_X} ${number(this.cursor)} m ${PAGE_WIDTH - PAGE_MARGIN_X} ${number(this.cursor)} l S`);
    this.cursor -= 19;
  }

  private checkbox(x: number, baseline: number, checked: boolean): void {
    const y = baseline - 1;
    if (checked) {
      this.page.commands.push(`${ACCENT_COLOR} rg ${number(x)} ${number(y)} 10 10 re f`);
      this.page.commands.push(`1 1 1 RG 1.35 w ${number(x + 2)} ${number(y + 5)} m ${number(x + 4.2)} ${number(y + 2.8)} l ${number(x + 8.3)} ${number(y + 7.4)} l S`);
      return;
    }
    this.page.commands.push(`${MUTED_COLOR} RG 0.9 w ${number(x)} ${number(y)} 10 10 re S`);
  }

  paragraph(runs: PdfTextRun[], options: ParagraphOptions): void {
    const lineHeight = options.fontSize * 1.5;
    this.ensureSpace(options.before + lineHeight + (options.keepWithNext ? lineHeight * 1.7 : 0));
    this.cursor -= options.before;
    const availableWidth = CONTENT_WIDTH - options.indent;
    const lines = wrapRuns(runs, availableWidth, options.fontSize, !!options.bold);

    if (!runs.some((run) => run.text.trim())) {
      this.cursor -= lineHeight * 0.58 + options.after;
      return;
    }

    lines.forEach((line, index) => {
      this.ensureSpace(lineHeight);
      const baseline = this.cursor - options.fontSize;
      const totalWidth = lineWidth(line);
      const offset = options.align === 'center'
        ? Math.max(0, (availableWidth - totalWidth) / 2)
        : options.align === 'right' ? Math.max(0, availableWidth - totalWidth) : 0;
      let x = PAGE_MARGIN_X + options.indent + offset;

      if (index === 0 && options.checked !== undefined) {
        this.checkbox(PAGE_MARGIN_X + options.indent - 18, baseline, options.checked);
      } else if (index === 0 && options.marker) {
        const markerWidth = measureText(options.marker, options.fontSize);
        this.drawRun({ text: options.marker, muted: true }, options.marker,
          PAGE_MARGIN_X + options.indent - markerWidth - 8, baseline, options.fontSize);
      }
      if (options.quote) {
        this.page.commands.push(`${ACCENT_COLOR} RG 1.8 w ${PAGE_MARGIN_X + options.indent - 11} ${number(baseline - 4)} m ${PAGE_MARGIN_X + options.indent - 11} ${number(baseline + options.fontSize + 3)} l S`);
      }
      for (const segment of line) {
        const size = segment.run.size ?? options.fontSize;
        this.drawRun(segment.run, segment.text, x, baseline, size, !!options.bold);
        x += segment.width;
      }
      this.cursor -= lineHeight;
    });

    this.cursor -= options.after;
  }

  private image(node: RichTextNode, context: BlockContext): void {
    const storagePath = String(node.attrs?.storagePath ?? '');
    const image = this.images.get(storagePath);
    if (!image) throw new Error(`Could not export note image: ${String(node.attrs?.alt ?? 'image')}`);

    const maxWidth = CONTENT_WIDTH - context.indent;
    const maxHeight = PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM - 26;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    this.ensureSpace(height + 24);
    this.cursor -= 10;

    const alignment = node.attrs?.align;
    const left = PAGE_MARGIN_X + context.indent
      + (alignment === 'right' ? maxWidth - width : alignment === 'left' ? 0 : (maxWidth - width) / 2);
    const bottom = this.cursor - height;
    let key = this.imageKeys.get(storagePath);
    if (!key) {
      key = `Im${this.imageKeys.size + 1}`;
      this.imageKeys.set(storagePath, key);
    }
    this.page.images.add(key);
    this.page.commands.push(`q ${number(width)} 0 0 ${number(height)} ${number(left)} ${number(bottom)} cm /${key} Do Q`);
    this.cursor = bottom - 14;
  }

  private goal(node: RichTextNode, context: BlockContext): void {
    const title = this.goalTitles.get(String(node.attrs?.goalId ?? '')) ?? 'Goal referenced in this note';
    const width = CONTENT_WIDTH - context.indent;
    this.ensureSpace(48);
    this.cursor -= 8;
    const bottom = this.cursor - 31;
    this.page.commands.push(`${LIGHT_COLOR} rg ${PAGE_MARGIN_X + context.indent} ${number(bottom)} ${number(width)} 31 re f`);
    this.page.commands.push(`${ACCENT_COLOR} RG 1.5 w ${PAGE_MARGIN_X + context.indent} ${number(bottom)} m ${PAGE_MARGIN_X + context.indent} ${number(bottom + 31)} l S`);
    this.drawRun({ text: `Goal: ${title}`, bold: true, goalReference: true },
      `Goal: ${title}`, PAGE_MARGIN_X + context.indent + 11, bottom + 10, 10.4);
    this.cursor = bottom - 9;
  }

  render(nodes: RichTextNode[], context: BlockContext = { indent: 0 }): void {
    for (const node of nodes) {
      switch (node.type) {
        case 'heading': {
          const level = node.attrs?.level === 2 ? 2 : node.attrs?.level === 3 ? 3 : 1;
          const size = level === 1 ? 22 : level === 2 ? 17.5 : 14.5;
          this.paragraph(textRuns(node.content), {
            ...context,
            fontSize: size,
            align: node.attrs?.textAlign === 'center' || node.attrs?.textAlign === 'right'
              ? node.attrs.textAlign : 'left',
            bold: true,
            before: level === 1 ? 15 : 12,
            after: 4,
            keepWithNext: true,
          });
          break;
        }
        case 'paragraph':
          this.paragraph(textRuns(node.content), {
            ...context,
            fontSize: 10.8,
            align: node.attrs?.textAlign === 'center' || node.attrs?.textAlign === 'right'
              ? node.attrs.textAlign : 'left',
            before: 1.5,
            after: 5,
          });
          break;
        case 'bulletList':
        case 'orderedList':
          (node.content ?? []).forEach((item, index) => {
            const start = typeof node.attrs?.start === 'number' ? node.attrs.start : 1;
            const marker = node.type === 'orderedList' ? `${start + index}.` : '•';
            this.renderListItem(item, { ...context, indent: context.indent + 22, marker });
          });
          this.cursor -= 3;
          break;
        case 'taskList':
          for (const item of node.content ?? []) {
            this.renderListItem(item, {
              ...context,
              indent: context.indent + 22,
              checked: item.attrs?.checked === true,
            });
          }
          this.cursor -= 3;
          break;
        case 'blockquote':
          this.render(node.content ?? [], { ...context, indent: context.indent + 16, quote: true });
          break;
        case 'horizontalRule':
          this.ensureSpace(22);
          this.cursor -= 9;
          this.page.commands.push(`0.855 0.882 0.863 RG 0.7 w ${PAGE_MARGIN_X + context.indent} ${number(this.cursor)} m ${PAGE_WIDTH - PAGE_MARGIN_X} ${number(this.cursor)} l S`);
          this.cursor -= 11;
          break;
        case 'goalCard':
          this.goal(node, context);
          break;
        case 'noteImage':
          this.image(node, context);
          break;
        default:
          if (node.content?.length) this.render(node.content, context);
      }
    }
  }

  private renderListItem(node: RichTextNode, context: BlockContext): void {
    let first = true;
    for (const child of node.content ?? []) {
      this.render([child], first ? context : {
        ...context,
        marker: undefined,
        checked: undefined,
      });
      first = false;
    }
  }

  finish(): { pages: PdfPage[]; imageKeys: Map<string, string> } {
    this.pages.forEach((page, index) => {
      const footer = `${index + 1} / ${this.pages.length}`;
      const x = PAGE_WIDTH - PAGE_MARGIN_X - measureText(footer, 8.4);
      page.commands.push(`BT /F1 8.4 Tf ${MUTED_COLOR} rg 1 0 0 1 ${number(x)} 35 Tm ${pdfHex(footer)} Tj ET`);
    });
    return { pages: this.pages, imageKeys: this.imageKeys };
  }
}

function bytes(value: string): Uint8Array {
  return encoder.encode(value);
}

function join(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function stream(dictionary: string, content: Uint8Array): Uint8Array {
  return join([
    bytes(`<< ${dictionary} /Length ${content.byteLength} >>\nstream\n`),
    content,
    bytes('\nendstream'),
  ]);
}

function buildPdf(
  pages: PdfPage[],
  imageKeys: Map<string, string>,
  images: Map<string, NotePdfImage>,
): Uint8Array {
  const objects: Uint8Array[] = [new Uint8Array()];
  const reserve = () => {
    objects.push(new Uint8Array());
    return objects.length - 1;
  };
  const add = (value: string | Uint8Array) => {
    const id = reserve();
    objects[id] = typeof value === 'string' ? bytes(value) : value;
    return id;
  };

  const catalogId = reserve();
  const pagesId = reserve();
  const fontIds = {
    F1: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    F2: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
    F3: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>'),
    F4: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>'),
  };
  const imageIds = new Map<string, number>();
  for (const [path, key] of imageKeys) {
    const image = images.get(path);
    if (!image) continue;
    imageIds.set(key, add(stream(
      `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      image.bytes,
    )));
  }

  const pageIds = pages.map(() => reserve());
  pages.forEach((page, index) => {
    const contentId = add(stream('', bytes(page.commands.join('\n'))));
    const annotations = page.links.map((link) => add(
      `<< /Type /Annot /Subtype /Link /Rect [${link.rect.map(number).join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${pdfLiteral(link.href)}) >> >>`,
    ));
    const fonts = Object.entries(fontIds).map(([key, id]) => `/${key} ${id} 0 R`).join(' ');
    const xObjects = [...page.images].map((key) => `/${key} ${imageIds.get(key)} 0 R`).join(' ');
    const resources = `<< /Font << ${fonts} >>${xObjects ? ` /XObject << ${xObjects} >>` : ''} >>`;
    const annots = annotations.length
      ? ` /Annots [${annotations.map((id) => `${id} 0 R`).join(' ')}]`
      : '';
    objects[pageIds[index] as number] = bytes(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentId} 0 R${annots} >>`,
    );
  });
  objects[catalogId] = bytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects[pagesId] = bytes(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);

  const parts = [bytes('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n')];
  const offsets = [0];
  let offset = parts[0]?.byteLength ?? 0;
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = offset;
    const chunk = join([bytes(`${id} 0 obj\n`), objects[id] as Uint8Array, bytes('\nendobj\n')]);
    parts.push(chunk);
    offset += chunk.byteLength;
  }
  const xref = [
    `xref\n0 ${objects.length}\n0000000000 65535 f \n`,
    ...offsets.slice(1).map((entry) => `${String(entry).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${offset}\n%%EOF`,
  ].join('');
  parts.push(bytes(xref));
  return join(parts);
}

export async function createNotePdf(options: NotePdfOptions): Promise<Uint8Array> {
  const nodes = normalizeNodes(options.document, options.plainText);
  const imageNodes = new Map<string, string>();
  walkNodes(nodes, (node) => {
    if (node.type === 'noteImage' && typeof node.attrs?.storagePath === 'string') {
      imageNodes.set(node.attrs.storagePath, String(node.attrs.alt ?? 'Note image'));
    }
  });

  const images = new Map<string, NotePdfImage>();
  if (imageNodes.size && !options.loadImage) {
    throw new Error('Private note images could not be prepared for PDF export.');
  }
  await Promise.all([...imageNodes].map(async ([path, alt]) => {
    try {
      const image = await options.loadImage?.(path, alt);
      if (!image || !image.width || !image.height || !image.bytes.byteLength) {
        throw new Error('The image is empty or unreadable.');
      }
      images.set(path, image);
    } catch (error) {
      throw new Error(`Could not export image "${alt}": ${error instanceof Error ? error.message : 'image retrieval failed'}`);
    }
  }));

  const goals = new Map((options.goals ?? []).map((goal) => [goal.id, goal.title]));
  const layout = new PdfLayout(goals, images);
  layout.title(options.title.trim() || 'Untitled entry');
  layout.render(nodes);
  const result = layout.finish();
  return buildPdf(result.pages, result.imageKeys, images);
}
