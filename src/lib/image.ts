/** Client-side image preparation for uploads: decode, scale down, re-encode. */

export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
/** The API rejects uploads above this. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

interface Decoded {
  image: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return { image: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      /* fall back to <img> below (e.g. older Safari with some formats) */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('That file could not be read as an image. Try a PNG, JPG or WebP.');
  }
  return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Throws a readable Error when the file is not an image or is over 10 MB. */
export function checkImageFile(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (PNG, JPG, WebP or AVIF).');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That photo is over 10 MB. Choose a smaller one.');
}

/**
 * Scales the image to at most `maxWidth` px wide (keeping its aspect ratio) and encodes it as
 * WebP at quality 0.85, falling back to JPEG when the browser cannot encode WebP.
 */
export async function resizeImage(file: File, maxWidth = 1600): Promise<Blob> {
  checkImageFile(file);
  const source = await decode(file);
  try {
    if (!source.width || !source.height) throw new Error('That image has no size. Try a PNG, JPG or WebP.');
    const scale = Math.min(1, maxWidth / source.width);
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot resize images.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source.image, 0, 0, width, height);

    let type = 'image/webp';
    for (const quality of [0.85, 0.72, 0.6]) {
      let blob = type === 'image/webp' ? await toBlob(canvas, type, quality) : null;
      if (type === 'image/webp' && blob?.type !== 'image/webp') {
        // No WebP encoder (the browser silently returns PNG). JPEG has no alpha, so paint white behind.
        type = 'image/jpeg';
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
        blob = null;
      }
      if (!blob) blob = await toBlob(canvas, type, quality);
      if (!blob) throw new Error('Could not prepare the image. Try another file.');
      if (blob.size <= MAX_UPLOAD_BYTES) return blob;
    }
    throw new Error('That photo is still over 3 MB after resizing. Try a simpler or smaller image.');
  } finally {
    source.release();
  }
}
