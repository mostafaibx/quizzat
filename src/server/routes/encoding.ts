import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { HonoEnv } from '@/types/cloudflare';
import { ApiErrors } from '../middleware/error';
import { verifyWebhookSignature, parseWebhookPayload } from '@/lib/pubsub';
import { processWebhook } from '../services/encoding-job.service';

const encodingRoutes = new Hono<HonoEnv>();

/**
 * POST /encoding/webhook
 * GCP encoding service webhook handler.
 * Receives callbacks for encoding job progress and completion.
 * This endpoint should be called by the GCP encoding service, not by users.
 */
encodingRoutes.post('/encoding/webhook', async (c) => {
  const webhookSecret = c.env.ENCODING_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Encoding webhook secret not configured');
    throw ApiErrors.internal('Webhook not configured');
  }

  // Verify webhook signature
  const signature = c.req.header('X-Webhook-Signature');
  if (!signature) {
    throw ApiErrors.unauthorized('Missing webhook signature');
  }

  const rawBody = await c.req.text();
  const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);

  if (!isValid) {
    throw ApiErrors.unauthorized('Invalid webhook signature');
  }

  // Parse and validate the payload
  let payload;
  try {
    payload = parseWebhookPayload(rawBody);
  } catch (error) {
    console.error('Invalid webhook payload:', error);
    throw ApiErrors.badRequest('Invalid webhook payload');
  }

  // Process the webhook
  const deps = { db: drizzle(c.env.DB) };

  try {
    await processWebhook(deps, payload);
  } catch (error) {
    console.error('Error processing encoding webhook:', error);
    // Return 200 to prevent retries for non-recoverable errors
    // The encoding service should implement its own retry logic
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
    });
  }

  return c.json({
    success: true,
    data: {
      event: payload.event,
      videoId: payload.videoId,
      jobId: payload.jobId,
    },
  });
});

export default encodingRoutes;
