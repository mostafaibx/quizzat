/**
 * GCP Pub/Sub Client for Video Encoding Jobs
 *
 * Publishes encoding job messages to GCP Pub/Sub for processing by the encoding service.
 * Also handles webhook signature verification for callbacks from the encoding service.
 */

import type {
  EncodingJobMessage,
  WebhookPayload,
} from '@/types/encoding.types';
import { webhookPayloadSchema } from '@/types/encoding.types';

// ============================================================================
// Types
// ============================================================================

export interface PubSubConfig {
  projectId: string;
  topicName: string;
  serviceAccountKey: string; // JSON string of service account credentials
}

export interface PublishResult {
  messageId: string;
}

// ============================================================================
// GCP Authentication
// ============================================================================

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

/**
 * Creates a JWT for GCP authentication.
 */
async function createJWT(
  credentials: ServiceAccountCredentials,
  scope: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiry

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id,
  };

  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token', // Token endpoint, not API
    scope, // OAuth scope for the API
    iat: now,
    exp,
  };

  const encoder = new TextEncoder();

  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const signInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signInput}.${signatureB64}`;
}

/**
 * Gets an access token for GCP API calls.
 */
async function getAccessToken(
  credentials: ServiceAccountCredentials
): Promise<string> {
  const jwt = await createJWT(
    credentials,
    'https://www.googleapis.com/auth/pubsub' // Pub/Sub OAuth scope
  );

  const response = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// ============================================================================
// Pub/Sub Operations
// ============================================================================

/**
 * Publishes an encoding job message to GCP Pub/Sub.
 */
export async function publishEncodingJob(
  config: PubSubConfig,
  message: EncodingJobMessage
): Promise<PublishResult> {
  // Decode base64-encoded service account key
  const decodedKey = atob(config.serviceAccountKey);
  const credentials = JSON.parse(decodedKey) as ServiceAccountCredentials;
  const accessToken = await getAccessToken(credentials);

  const url = `https://pubsub.googleapis.com/v1/projects/${config.projectId}/topics/${config.topicName}:publish`;

  // Base64 encode the message data (handle Unicode characters like Arabic titles)
  const messageJson = JSON.stringify(message);
  const messageBytes = new TextEncoder().encode(messageJson);
  const messageData = btoa(String.fromCharCode(...messageBytes));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          data: messageData,
          attributes: {
            videoId: message.videoId,
            jobId: message.jobId,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to publish message: ${error}`);
  }

  const result = (await response.json()) as { messageIds: string[] };

  return {
    messageId: result.messageIds[0],
  };
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verifies a webhook signature from the encoding service.
 * Uses HMAC-SHA256 with the webhook secret.
 *
 * Expected header format: "t=<timestamp>,v1=<signature>"
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Parse signature header
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts['t'];
  const sig = parts['v1'];

  if (!timestamp || !sig) {
    return false;
  }

  // Verify timestamp is not too old (5 minute tolerance)
  const timestampMs = parseInt(timestamp, 10) * 1000;
  if (Date.now() - timestampMs > 5 * 60 * 1000) {
    return false;
  }

  // Calculate expected signature
  const signaturePayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(signaturePayload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    payloadData
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return sig === expectedSignature;
}

/**
 * Parses and validates a webhook payload.
 */
export function parseWebhookPayload(rawPayload: string): WebhookPayload {
  const data = JSON.parse(rawPayload);
  return webhookPayloadSchema.parse(data);
}

// ============================================================================
// Helper to create config from env
// ============================================================================

export function createPubSubConfig(env: {
  GCP_PROJECT_ID?: string;
  GCP_PUBSUB_TOPIC?: string;
  GCP_SERVICE_ACCOUNT_KEY?: string;
}): PubSubConfig | null {
  if (!env.GCP_PROJECT_ID || !env.GCP_PUBSUB_TOPIC || !env.GCP_SERVICE_ACCOUNT_KEY) {
    return null;
  }

  return {
    projectId: env.GCP_PROJECT_ID,
    topicName: env.GCP_PUBSUB_TOPIC,
    serviceAccountKey: env.GCP_SERVICE_ACCOUNT_KEY,
  };
}
