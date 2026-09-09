import { createSignedNoteImageUrl } from './services/note-image-service';
import { createNotePdf, type NotePdfImage } from './note-pdf';
import type { RichTextDocument } from './types';

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

async function encodeJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The image could not be prepared for print.'));
    }, 'image/jpeg', 0.9);
  });
}

async function loadPdfImage(storagePath: string): Promise<NotePdfImage> {
  const signedUrl = await createSignedNoteImageUrl(storagePath);
  const response = await fetch(signedUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Image request failed (${response.status}).`);
  const imageBlob = await response.blob();
  const image = await createImageBitmap(imageBlob);
  const maxDimension = 2_000;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));

  try {
    if (imageBlob.type === 'image/jpeg' && scale === 1 && imageBlob.size <= 2_500_000) {
      return {
        bytes: new Uint8Array(await imageBlob.arrayBuffer()),
        width: image.width,
        height: image.height,
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The browser cannot prepare document images.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = await encodeJpeg(canvas);
    return {
      bytes: new Uint8Array(await jpeg.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    image.close();
  }
}

export async function exportEntryPdf(
  title: string,
  plainText: string,
  options?: {
    document?: RichTextDocument;
    goals?: ReadonlyArray<{ id: string; title: string }>;
  },
): Promise<void> {
  if (typeof document === 'undefined') throw new Error('PDF export is available on web');
  const pdf = await createNotePdf({
    title,
    plainText,
    document: options?.document,
    goals: options?.goals,
    loadImage: loadPdfImage,
  });
  downloadBlob(new Blob([pdf as BlobPart], { type: 'application/pdf' }), safeFilename(title, 'pdf'));
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
