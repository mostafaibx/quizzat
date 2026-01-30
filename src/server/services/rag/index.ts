/**
 * RAG Service
 *
 * Video transcript indexing and semantic search.
 * Designed to be isolated for future extraction to a separate worker.
 *
 * Usage:
 *   import { indexVideoTranscript, searchTranscripts } from '@/server/services/rag';
 */

import { eq } from 'drizzle-orm';
import { videos } from '@/db/schema';
import type { VideoStatus } from '@/types/video.types';
import type { TranscriptData } from '@/types/transcription.types';
import {
  type RagServiceDeps,
  type IndexingResult,
  type SearchQuery,
  type SearchResult,
} from './types';
import { chunkTranscript, getChunkStats } from './chunking';
import { storeChunksWithEmbeddings, deleteVideoChunks } from './storage';
import { searchChunks, getChunksForVideo } from './retrieval';

// ============================================================================
// Public Exports
// ============================================================================

export * from './types';
export { chunkTranscript, getChunkStats, estimateTokens } from './chunking';
export { embedText, embedTexts } from './embedding';
export { storeChunksWithEmbeddings, deleteVideoChunks } from './storage';
export { searchChunks, getChunkById, getChunksForVideo } from './retrieval';

// ============================================================================
// Main Orchestration Functions
// ============================================================================

/**
 * Index a video transcript for semantic search.
 * Fetches transcript from R2, chunks it, generates embeddings, and stores.
 *
 * @param deps - Service dependencies
 * @param videoId - The video ID to index
 * @returns Indexing result with statistics
 */
export async function indexVideoTranscript(
  deps: RagServiceDeps,
  videoId: string
): Promise<IndexingResult> {
  console.log(`[RAG] Starting indexing for video ${videoId}`);

  // Step 1: Get video record
  const [video] = await deps.db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  if (!video) {
    throw new Error(`Video not found: ${videoId}`);
  }

  if (!video.transcriptPath) {
    throw new Error(`No transcript available for video: ${videoId}`);
  }

  // Step 2: Fetch transcript from R2
  console.log(`[RAG] Fetching transcript from ${video.transcriptPath}`);
  const transcriptObject = await deps.r2Bucket.get(video.transcriptPath);

  if (!transcriptObject) {
    throw new Error(`Transcript not found in R2: ${video.transcriptPath}`);
  }

  const transcriptJson = await transcriptObject.text();
  const transcript = JSON.parse(transcriptJson) as TranscriptData;

  // Step 3: Delete existing chunks (for re-indexing)
  await deleteVideoChunks(
    { db: deps.db, vectorize: deps.vectorize },
    videoId
  );

  // Step 4: Chunk the transcript
  console.log(`[RAG] Chunking transcript with ${transcript.segments.length} segments`);
  const chunks = chunkTranscript(transcript, videoId, video.moduleId);

  if (chunks.length === 0) {
    console.log(`[RAG] No chunks created (empty transcript)`);
    return {
      videoId,
      chunksCreated: 0,
      embeddingsStored: 0,
      processingTimeMs: 0,
    };
  }

  const stats = getChunkStats(chunks);
  console.log(`[RAG] Created ${stats.totalChunks} chunks (avg ${stats.avgTokensPerChunk} tokens)`);

  // Step 5: Store chunks with embeddings
  const result = await storeChunksWithEmbeddings(
    { db: deps.db, vectorize: deps.vectorize },
    chunks,
    deps.geminiApiKey
  );

  // Step 6: Update video record
  await deps.db
    .update(videos)
    .set({
      // Could add indexing status fields here if needed
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    })
    .where(eq(videos.id, videoId));

  console.log(`[RAG] Indexing complete for video ${videoId}`);
  return result;
}

/**
 * Search transcripts for relevant content.
 *
 * @param deps - Service dependencies (without r2Bucket)
 * @param query - Search query parameters
 * @returns Search results with ranked chunks
 */
export async function searchTranscripts(
  deps: Omit<RagServiceDeps, 'r2Bucket'>,
  query: SearchQuery
): Promise<SearchResult> {
  return searchChunks(
    {
      db: deps.db,
      vectorize: deps.vectorize,
      geminiApiKey: deps.geminiApiKey,
    },
    query
  );
}

/**
 * Get all indexed chunks for a video.
 *
 * @param deps - Database dependency
 * @param videoId - The video ID
 * @returns All chunks for the video
 */
export async function getVideoChunks(
  deps: Pick<RagServiceDeps, 'db'>,
  videoId: string
) {
  return getChunksForVideo(deps, videoId);
}

/**
 * Retry RAG indexing for a video that previously failed.
 * Updates video status to 'indexing' then 'ready' or 'failed_indexing'.
 *
 * @param deps - Service dependencies
 * @param videoId - The video ID to re-index
 * @returns Indexing result with statistics
 */
export async function retryVideoIndexing(
  deps: RagServiceDeps,
  videoId: string
): Promise<IndexingResult & { status: 'ready' | 'failed_indexing'; error?: string }> {
  const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Set status to indexing
  await deps.db
    .update(videos)
    .set({
      status: 'indexing',
      errorMessage: null,
      updatedAt: now(),
    })
    .where(eq(videos.id, videoId));

  try {
    const result = await indexVideoTranscript(deps, videoId);

    // Set status to ready
    await deps.db
      .update(videos)
      .set({
        status: 'ready',
        updatedAt: now(),
      })
      .where(eq(videos.id, videoId));

    return { ...result, status: 'ready' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'RAG indexing failed';
    console.error(`[RAG] Retry indexing failed for video ${videoId}:`, error);

    // Set status to failed_indexing
    await deps.db
      .update(videos)
      .set({
        status: 'failed_indexing',
        errorMessage: errorMsg,
        updatedAt: now(),
      })
      .where(eq(videos.id, videoId));

    return {
      videoId,
      chunksCreated: 0,
      embeddingsStored: 0,
      processingTimeMs: 0,
      status: 'failed_indexing',
      error: errorMsg,
    };
  }
}
