import JSZip from 'jszip';

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.ts'];

export function getFileCategory(filename: string): 'image' | 'video' | 'zip' | 'other' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.zip')) return 'zip';
  if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'image';
  if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'video';
  return 'other';
}

export function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  if (lower.endsWith('.flv')) return 'video/x-flv';
  if (lower.endsWith('.ts')) return 'video/mp2t';
  return 'application/octet-stream';
}

/**
 * Extracts all supported media files from a ZIP archive
 */
export async function extractZipFiles(zipFile: File): Promise<File[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);
  const extractedFiles: File[] = [];

  for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
    // Skip directories and Mac __MACOSX metadata
    if (zipEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.includes('/.')) {
      continue;
    }

    const category = getFileCategory(zipEntry.name);
    if (category === 'image' || category === 'video') {
      const blob = await zipEntry.async('blob');
      const mime = getMimeType(zipEntry.name);
      // Clean basename if nested
      const cleanName = zipEntry.name.split('/').pop() || zipEntry.name;
      const file = new File([blob], cleanName, { type: mime });
      extractedFiles.push(file);
    }
  }

  return extractedFiles;
}

/**
 * Creates an archive ZIP of all processed files with suffix "_anonymized"
 */
export async function createAnonymizedZip(
  items: Array<{ name: string; blob: Blob }>
): Promise<Blob> {
  const zip = new JSZip();

  for (const item of items) {
    const extIndex = item.name.lastIndexOf('.');
    let base = item.name;
    let ext = '';
    if (extIndex !== -1) {
      base = item.name.substring(0, extIndex);
      ext = item.name.substring(extIndex);
    }
    const anonymizedName = `${base}_anonymized${ext}`;
    zip.file(anonymizedName, item.blob);
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
