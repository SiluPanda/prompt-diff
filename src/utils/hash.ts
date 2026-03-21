import { createHash } from 'node:crypto';

/**
 * Generate a SHA-256 content hash of the given text.
 */
export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
