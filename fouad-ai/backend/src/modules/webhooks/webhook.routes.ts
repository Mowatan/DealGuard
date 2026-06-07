import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { emailProcessingQueue } from '../../lib/queue';

// Reject webhook calls whose signed timestamp is older than this (replay protection)
const SIGNATURE_MAX_AGE_SECONDS = 15 * 60; // 15 minutes

/**
 * Verify a Mailgun inbound-route / webhook signature.
 *
 * Mailgun signs requests with: signature = HMAC-SHA256(signingKey, timestamp + token).
 * Fields may arrive flat (form-encoded routes) or nested under a `signature` object
 * (newer JSON webhooks), so we accept both shapes.
 *
 * Returns true only when the signature is present, fresh, and valid.
 */
export function verifyMailgunSignature(body: any): boolean {
  const signingKey =
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET || process.env.MAILGUN_API_KEY;

  // Fail closed: without a signing key we cannot authenticate the caller.
  if (!signingKey) {
    return false;
  }

  const sig = body?.signature && typeof body.signature === 'object' ? body.signature : body;
  const timestamp = sig?.timestamp;
  const token = sig?.token;
  const signature = sig?.signature;

  if (!timestamp || !token || !signature) {
    return false;
  }

  // Replay protection: reject stale timestamps.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > SIGNATURE_MAX_AGE_SECONDS) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', signingKey)
    .update(`${timestamp}${token}`)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks.
  const expectedBuf = Buffer.from(expected, 'hex');
  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(String(signature), 'hex');
  } catch {
    return false;
  }

  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export async function webhookRoutes(server: FastifyInstance) {
  // Inbound email webhook (Mailgun/Sendgrid format)
  server.post('/email/inbound', {
    config: {
      // Tighter than the global limit: this endpoint is public (signature-gated).
      rateLimit: {
        max: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || '30', 10),
        timeWindow: process.env.WEBHOOK_RATE_LIMIT_WINDOW || '1 minute',
      },
    },
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      // Verify webhook signature before trusting any of the payload.
      // Inbound evidence drives fund-release decisions, so unauthenticated
      // callers must never be able to inject EvidenceItems.
      const isProduction = process.env.NODE_ENV === 'production';
      const signatureValid = verifyMailgunSignature(body);

      if (!signatureValid) {
        const secretConfigured = !!(
          process.env.INBOUND_EMAIL_WEBHOOK_SECRET || process.env.MAILGUN_API_KEY
        );

        // In production we always reject. In non-production we also reject when a
        // secret IS configured; we only allow through when no secret is set at all
        // (local development) and log a loud warning.
        if (isProduction || secretConfigured) {
          request.log.warn('Rejected inbound email webhook: invalid or missing signature');
          return reply.code(401).send({ error: 'Invalid webhook signature' });
        }

        request.log.warn(
          '⚠️  Inbound email webhook signature NOT verified (no INBOUND_EMAIL_WEBHOOK_SECRET/MAILGUN_API_KEY set). This is only acceptable in local development.'
        );
      }

      // Parse email data (this is a simplified version)
      const emailData = {
        to: body.recipient || body.To,
        from: body.sender || body.From,
        subject: body.subject || body.Subject,
        bodyPlain: body['body-plain'] || body.text || '',
        bodyHtml: body['body-html'] || body.html,
        attachments: parseAttachments(body),
        timestamp: new Date(),
      };

      // Queue for processing
      await emailProcessingQueue.add('process-email', { emailData });

      return reply.code(200).send({ success: true, message: 'Email queued for processing' });
    } catch (error) {
      server.log.error(error, 'Error processing inbound email webhook');
      return reply.code(500).send({ error: 'Failed to process email' });
    }
  });

  // Health check for webhooks
  server.get('/health', async () => {
    return { status: 'ok', service: 'webhooks' };
  });
}

function parseAttachments(body: any): Array<{
  filename: string;
  contentType: string;
  content: Buffer;
}> {
  // This is a simplified parser
  // In production, you'd parse multipart/form-data attachments properly
  const attachments: any[] = [];

  if (body.attachments) {
    try {
      const parsed = JSON.parse(body.attachments);
      for (const att of parsed) {
        if (body[`attachment-${att.name}`]) {
          attachments.push({
            filename: att.name,
            contentType: att.type,
            content: Buffer.from(body[`attachment-${att.name}`], 'base64'),
          });
        }
      }
    } catch (e) {
      console.error('Error parsing attachments:', e);
    }
  }

  return attachments;
}
