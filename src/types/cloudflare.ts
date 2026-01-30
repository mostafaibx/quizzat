/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedUser } from './auth.types';

// Workers AI types
export interface WorkersAI {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export type CloudflareBindings = {
  DB: D1Database;
  FILES: R2Bucket;
  KV?: KVNamespace;
  NEXT_INC_CACHE_KV?: KVNamespace;

  // AI and Vectorize bindings
  AI?: WorkersAI;
  VECTORIZE?: VectorizeIndex;

  // Auth
  NEXTAUTH_SECRET?: string;

  // Cloudflare
  CLOUDFLARE_ACCOUNT_ID?: string;

  // GCP Encoding Service
  GCP_PROJECT_ID?: string;
  GCP_PUBSUB_TOPIC?: string;
  GCP_SERVICE_ACCOUNT_KEY?: string;
  ENCODING_WEBHOOK_SECRET?: string;

  // R2 Configuration
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string; // CDN URL for public access

  // Gemini API (for transcription and embeddings)
  GEMINI_API_KEY?: string;

  // Environment variables
  ALLOWED_ORIGINS?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
};

export type HonoEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    user?: AuthenticatedUser;
    requestId?: string;
    userId?: string;
    parsedBody?: unknown;
    [key: string]: unknown;
  };
};

export interface AppEnv {
  DB: D1Database;
  FILES: R2Bucket;
  AI?: WorkersAI;
  VECTORIZE?: VectorizeIndex;
  CLOUDFLARE_ACCOUNT_ID?: string;
  GCP_PROJECT_ID?: string;
  GCP_PUBSUB_TOPIC?: string;
  GCP_SERVICE_ACCOUNT_KEY?: string;
  ENCODING_WEBHOOK_SECRET?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;
  GEMINI_API_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
}

export interface AppContext {
  env: AppEnv;
  ctx?: ExecutionContext;
}
