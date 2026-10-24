/**
 * Safe Client Image Upload & Compression Utility (Phase 7)
 * - Enforces allowed image MIME types ('image/jpeg', 'image/png', 'image/webp').
 * - Rejects oversized files (> 5 MB raw file size).
 * - Resizes and compresses valid photographs via HTML5 canvas to a compact JPEG data URL
 *   that fits safely within Firestore document limits (<= 280,000 characters).
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_RAW_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ENCODED_DATA_URL_LENGTH = 280000;

export function validateImageFileMetadata(file: File): {
  valid: boolean;
  error?: string;
} {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
    )
  ) {
    return {
      valid: false,
      error:
        'Unsupported file format. Please upload a JPG, PNG, or WebP photograph.',
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: 'The selected image file is empty.',
    };
  }

  if (file.size > MAX_RAW_IMAGE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image file is too large (${sizeMb} MB). Maximum allowed file size is 5 MB.`,
    };
  }

  return { valid: true };
}

export async function processAndCompressImageFile(
  file: File,
  options?: { maxDimension?: number; maxDataUrlLength?: number }
): Promise<string> {
  const metaCheck = validateImageFileMetadata(file);
  if (!metaCheck.valid) {
    throw new Error(metaCheck.error);
  }

  const maxDimension = options?.maxDimension ?? 1200;
  const maxAllowedLength =
    options?.maxDataUrlLength ?? MAX_ENCODED_DATA_URL_LENGTH;

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error('Failed to read the selected image file.'));

    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();

      img.onerror = () =>
        reject(
          new Error(
            'The selected file could not be decoded as a valid image.'
          )
        );

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Browser canvas context is unavailable.'));
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          let quality = 0.78;
          let compressedUrl = canvas.toDataURL('image/jpeg', quality);

          while (
            compressedUrl.length > maxAllowedLength &&
            quality > 0.4
          ) {
            quality -= 0.12;
            compressedUrl = canvas.toDataURL('image/jpeg', quality);
          }

          if (compressedUrl.length > maxAllowedLength) {
            reject(
              new Error(
                'Image remains too large after compression. Please choose a smaller photograph.'
              )
            );
            return;
          }

          resolve(compressedUrl);
        } catch (err) {
          reject(
            err instanceof Error
              ? err
              : new Error('Failed to compress image file.')
          );
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compresses a vendor profile picture or user avatar to a crisp 400px max dimension
 * JPEG data URL (<= 150 KB) suitable for header badges, vendor cards, and profile summaries.
 */
export async function processAndCompressAvatarImage(
  file: File
): Promise<string> {
  return processAndCompressImageFile(file, {
    maxDimension: 400,
    maxDataUrlLength: 150000,
  });
}

