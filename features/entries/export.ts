function safeFilename(title: string, extension: string): string {
  const base = title.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').slice(0, 80)
    || 'Ohara-entry';
  return `${base}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function wrapLines(text: string, width = 88): string[] {
  return text.split(/\r?\n/).flatMap((paragraph) => {
    if (!paragraph.trim()) return [''];
    const words = paragraph.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if (!line) {
        line = word;
      } else if (`${line} ${word}`.length <= width) {
        line += ` ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  });
}

function pdfEscape(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function exportEntryPdf(title: string, plainText: string): void {
  if (typeof document === 'undefined') throw new Error('PDF export is available on web');
  const lines = wrapLines(`${title || 'Untitled entry'}\n\n${plainText}`);
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(lines.length / 43)) },
    (_, index) => lines.slice(index * 43, (index + 1) * 43),
  );
  const fontObjectId = 3 + pages.length * 2;
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    const commands = [
      'BT',
      '/F1 12 Tf',
      '50 742 Td',
      '16 TL',
      ...pageLines.flatMap((line) => [`(${pdfEscape(line)}) Tj`, 'T*']),
      'ET',
    ].join('\n');
    objects[contentId] = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
  });
  objects[fontObjectId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id <= fontObjectId; id += 1) {
    offsets[id] = new TextEncoder().encode(pdf).length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${fontObjectId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontObjectId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${fontObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), safeFilename(title, 'pdf'));
}

export function exportEntryText(title: string, plainText: string): void {
  if (typeof document === 'undefined') throw new Error('Text export is available on web');
  downloadBlob(
    new Blob([`${title || 'Untitled entry'}\n\n${plainText}`], { type: 'text/plain;charset=utf-8' }),
    safeFilename(title, 'txt'),
  );
}

export async function copyEntryText(title: string, plainText: string): Promise<void> {
  if (!navigator?.clipboard) throw new Error('Clipboard access is unavailable');
  await navigator.clipboard.writeText(`${title || 'Untitled entry'}\n\n${plainText}`);
}
