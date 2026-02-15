import { FastifyInstance } from 'fastify';
import { emailProcessingQueue } from '../../lib/queue';

export async function webhookRoutes(server: FastifyInstance) {
  // Inbound email webhook (Mailgun/Sendgrid format)
  server.post('/email/inbound', async (request, reply) => {
    try {
      const body = request.body as any;

      // Verify webhook signature if configured
      // TODO: Implement signature verification based on email provider

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
