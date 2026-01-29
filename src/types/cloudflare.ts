/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedUser } from './auth.types';

// Vectorize types
export interface VectorizeVector {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>;
}

export interface VectorizeQueryResult {
  id: string;
  score: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface VectorizeIndex {
  insert(vectors: VectorizeVector[]): Promise<{ mutationId: string; ids: string[] }>;
  upsert(vectors: VectorizeVector[]): Promise<{ mutationId: string; ids: string[] }>;
  query(vector: number[], options?: {
    topK?: number;
    returnMetadata?: boolean;
    filter?: Record<string, string | number | boolean>;
  }): Promise<{ matches: VectorizeQueryResult[] }>;
  getByIds(ids: string[]): Promise<VectorizeVector[]>;
  deleteByIds(ids: string[]): Promise<{ mutationId: string }>;
}

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
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
}

export interface AppContext {
  env: AppEnv;
  ctx?: ExecutionContext;
}
