/**
 * Storage Service
 *
 * Store chunks in D1 and vectors in Vectorize.
 * Implements saga pattern for transactional consistency.
 */

import { eq } from 'drizzle-orm';
import { transcriptChunks } from '@/db/schema';
import {
  type TranscriptChunk,
  type StorageDeps,
  type IndexingResult,
  RAG_CONSTANTS,
} from './types';
import { embedTexts } from './embedding';

// ============================================================================
// Main Storage Function
// ============================================================================

/**
 * Store chunks with embeddings in D1 and Vectorize.
 * Uses saga pattern: if any step fails, compensate by rolling back.
 *
 * @param deps - Storage dependencies
 * @param chunks - Chunks to store
 * @param geminiApiKey - Gemini API key for embeddings
 * @returns Indexing result with statistics
 */
export async function storeChunksWithEmbeddings(
  deps: StorageDeps,
  chunks: TranscriptChunk[],
  geminiApiKey: string
): Promise<IndexingResult> {
  if (chunks.length === 0) {
    return {
      videoId: '',
      chunksCreated: 0,
      embeddingsStored: 0,
      processingTimeMs: 0,
    };
  }

  const startTime = Date.now();
  const videoId = chunks[0].videoId;
  const insertedVectorIds: string[] = [];

  try {
    // Step 1: Generate all embeddings first
    console.log(`[RAG/Storage] Generating embeddings for ${chunks.length} chunks`);
    const allEmbeddings = await embedTexts(
      { geminiApiKey },
      chunks.map((c) => c.content)
    );

    // Step 2: Store in D1 (small batches due to parameter limits)
    console.log(`[RAG/Storage] Storing ${chunks.length} chunks in D1`);
    for (let i = 0; i < chunks.length; i += RAG_CONSTANTS.D1_BATCH_SIZE) {
      const batch = chunks.slice(i, i + RAG_CONSTANTS.D1_BATCH_SIZE);
      const values = batch.map((chunk) => ({
        id: chunk.id,
        videoId: chunk.videoId,
        moduleId: chunk.moduleId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        metadata: JSON.stringify(chunk.metadata),
      }));
      await deps.db.insert(transcriptChunks).values(values);
    }

    // Step 3: Store vectors in Vectorize (larger batches allowed)
    console.log(`[RAG/Storage] Storing ${chunks.length} vectors in Vectorize`);
    for (let i = 0; i < chunks.length; i += RAG_CONSTANTS.VECTORIZE_BATCH_SIZE) {
      const batch = chunks.slice(i, i + RAG_CONSTANTS.VECTORIZE_BATCH_SIZE);
      const vectors = batch.map((chunk, idx) => ({
        id: chunk.id,
        values: allEmbeddings[i + idx],
        metadata: {
          videoId: chunk.videoId,
          moduleId: chunk.moduleId,
          chunkIndex: chunk.chunkIndex,
          startTime: Math.round(chunk.startTime),
        },
      }));

      await deps.vectorize.upsert(vectors);
      insertedVectorIds.push(...vectors.map((v) => v.id));
    }

    const processingTimeMs = Date.now() - startTime;
    console.log(`[RAG/Storage] Completed in ${processingTimeMs}ms`);

    return {
      videoId,
      chunksCreated: chunks.length,
      embeddingsStored: allEmbeddings.length,
      processingTimeMs,
    };
  } catch (error) {
    // Saga compensation: rollback on failure
    console.error(`[RAG/Storage] Failed, compensating:`, error);
    await compensateAll(deps, videoId, insertedVectorIds);
    throw error;
  }
}

// ============================================================================
// Compensation (Rollback) Functions
// ============================================================================

/**
 * Rollback all stored data on failure.
 */
async function compensateAll(
  deps: StorageDeps,
  videoId: string,
  vectorIds: string[]
): Promise<void> {
  const results = await Promise.allSettled([
    compensateD1(deps, videoId),
    compensateVectorize(deps, vectorIds),
  ]);

  const d1Result = results[0];
  const vectorizeResult = results[1];

  console.log(`[RAG/Storage] Compensation results:`, {
    d1: d1Result.status === 'fulfilled' ? 'ok' : 'failed',
    vectorize: vectorizeResult.status === 'fulfilled' ? 'ok' : 'failed',
  });
}

/**
 * Delete chunks from D1.
 */
async function compensateD1(deps: StorageDeps, videoId: string): Promise<void> {
  await deps.db.delete(transcriptChunks).where(eq(transcriptChunks.videoId, videoId));
}

/**
 * Delete vectors from Vectorize.
 */
async function compensateVectorize(deps: StorageDeps, vectorIds: string[]): Promise<void> {
  if (vectorIds.length === 0) return;

  for (let i = 0; i < vectorIds.length; i += RAG_CONSTANTS.VECTORIZE_BATCH_SIZE) {
    const batch = vectorIds.slice(i, i + RAG_CONSTANTS.VECTORIZE_BATCH_SIZE);
    await deps.vectorize.deleteByIds(batch);
  }
}

// ============================================================================
// Deletion Functions
// ============================================================================

/**
 * Delete all chunks for a video (for re-indexing or video deletion).
 */
export async function deleteVideoChunks(
  deps: StorageDeps,
  videoId: string
): Promise<void> {
  // Get all chunk IDs first (for Vectorize deletion)
  const existingChunks = await deps.db
    .select({ id: transcriptChunks.id })
    .from(transcriptChunks)
    .where(eq(transcriptChunks.videoId, videoId));

  const chunkIds = existingChunks.map((c) => c.id);

  // Delete from both stores
  await Promise.all([
    compensateD1(deps, videoId),
    compensateVectorize(deps, chunkIds),
  ]);

  console.log(`[RAG/Storage] Deleted ${chunkIds.length} chunks for video ${videoId}`);
}
