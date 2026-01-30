/**
 * RAG Service Types
 *
 * Type definitions for the video transcript RAG service.
 * Designed to be isolated for future extraction to a separate worker.
 */

import type { DrizzleD1Database } from 'drizzle-orm/d1';

// ============================================================================
// Chunk Types
// ============================================================================

/**
 * Metadata for a transcript chunk
 */
export interface ChunkMetadata {
  segmentIds: number[];     // Original Whisper segment IDs
  avgConfidence: number;    // Average STT confidence (0-1)
  language: string;         // Detected language code
}

/**
 * A chunk of transcript content for embedding and retrieval
 */
export interface TranscriptChunk {
  id: string;               // chk_{uuid}
  videoId: string;
  moduleId: string;
  chunkIndex: number;
  content: string;          // Combined segment text
  tokenCount: number;
  startTime: number;        // Start timestamp in seconds
  endTime: number;          // End timestamp in seconds
  metadata: ChunkMetadata;
}

/**
 * A retrieved chunk with similarity score
 */
export interface RetrievedChunk extends TranscriptChunk {
  score: number;            // Similarity score (0-1)
}

// ============================================================================
// Service Dependencies
// ============================================================================

/**
 * Dependencies for RAG service operations
 * Uses global Cloudflare VectorizeIndex type
 */
export interface RagServiceDeps {
  db: DrizzleD1Database;
  vectorize: VectorizeIndex;
  geminiApiKey: string;
  r2Bucket: R2Bucket;
}

/**
 * Minimal deps for embedding only
 */
export interface EmbeddingDeps {
  geminiApiKey: string;
}

/**
 * Minimal deps for storage only
 * Uses global Cloudflare VectorizeIndex type
 */
export interface StorageDeps {
  db: DrizzleD1Database;
  vectorize: VectorizeIndex;
}

/**
 * Minimal deps for retrieval only
 * Uses global Cloudflare VectorizeIndex type
 */
export interface RetrievalDeps {
  db: DrizzleD1Database;
  vectorize: VectorizeIndex;
  geminiApiKey: string;
}

// ============================================================================
// Indexing Types
// ============================================================================

/**
 * Result of indexing a video transcript
 */
export interface IndexingResult {
  videoId: string;
  chunksCreated: number;
  embeddingsStored: number;
  processingTimeMs: number;
}

/**
 * Indexing status for a video
 */
export type IndexingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ============================================================================
// Query Types
// ============================================================================

/**
 * Search query parameters
 */
export interface SearchQuery {
  query: string;
  moduleId?: string;        // Filter by module
  videoId?: string;         // Filter by specific video
  topK?: number;            // Number of results (default: 5)
  minScore?: number;        // Minimum similarity score (default: 0.5)
}

/**
 * Search result
 */
export interface SearchResult {
  chunks: RetrievedChunk[];
  query: string;
  totalFound: number;
  searchTimeMs: number;
}

// ============================================================================
// Constants
// ============================================================================

export const RAG_CONSTANTS = {
  /** Target tokens per chunk */
  CHUNK_TARGET_TOKENS: 400,
  /** Minimum tokens for a chunk (don't create tiny chunks) */
  CHUNK_MIN_TOKENS: 100,
  /** Number of segments to overlap between chunks */
  CHUNK_OVERLAP_SEGMENTS: 1,
  /** Gemini embedding model */
  EMBEDDING_MODEL: 'text-embedding-004',
  /** Embedding dimensions (text-embedding-004 uses 768) */
  EMBEDDING_DIMENSIONS: 768,
  /** Maximum texts per embedding batch */
  EMBEDDING_BATCH_SIZE: 100,
  /** D1 insert batch size (due to parameter limits) */
  D1_BATCH_SIZE: 5,
  /** Vectorize upsert batch size */
  VECTORIZE_BATCH_SIZE: 100,
  /** Default number of results to return */
  DEFAULT_TOP_K: 5,
  /** Default minimum similarity score */
  DEFAULT_MIN_SCORE: 0.5,
} as const;

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique chunk ID
 */
export function generateChunkId(): string {
  return `chk_${crypto.randomUUID().replace(/-/g, '')}`;
}
