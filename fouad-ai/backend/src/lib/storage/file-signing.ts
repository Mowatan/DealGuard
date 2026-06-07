/**
 * Local file URL signing
 *
 * The local-filesystem fallback serves files via `GET /files/:bucket/:key`. By
 * default that route is open (preserving historical behavior). When
 * FILES_SIGNING_SECRET is set, URLs carry an HMAC signature and the route
 * rejects unsigned/forged requests, so sensitive documents are not retrievable
 * by guessing or enumerating keys.
 *
 * Signatures intentionally do NOT expire: the upload URL is persisted, so an
 * expiry would silently break already-stored links. The goal here is
 * unguessability and tamper-resistance, not time-boxed access.
 */
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signature for a local file path, or null when signing is disabled.
 */
export function signFilePath(bucket: string, key: string): string | null {
  const secret = process.env.FILES_SIGNING_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(`${bucket}/${key}`).digest('hex');
}

/**
 * Whether access to a local file should be allowed. Open when signing is
 * disabled (unchanged behavior); otherwise requires a matching signature.
 */
export function verifyFileAccess(
  bucket: string,
  key: string,
  sig: string | undefined,
): boolean {
  const expected = signFilePath(bucket, key);
  if (!expected) return true; // signing disabled -> preserve existing behavior
  if (!sig) return false;
  const provided = Buffer.from(sig);
  const valid = Buffer.from(expected);
  return provided.length === valid.length && timingSafeEqual(provided, valid);
}
