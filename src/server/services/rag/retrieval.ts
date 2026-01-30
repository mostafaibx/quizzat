/**
 * Retrieval Service
 *
 * Query and retrieve relevant chunks from the vector store.
 */

import { eq, inArray } from 'drizzle-orm';
import { transcriptChunks } from '@/db/schema';
import {
  type RetrievalDeps,
  type SearchQuery,
  type SearchResult,
  type RetrievedChunk,
  type ChunkMetadata,
  RAG_CONSTANTS,
} from './types';
import { embedText } from './embedding';

// ============================================================================
// Search Function
// ============================================================================

/**
 * Search for relevant chunks using semantic similarity.
 *
 * @param deps - Service dependencies
 * @param query - Search query parameters
 * @returns Search results with ranked chunks
 */
export async function searchChunks(
  deps: RetrievalDeps,
  query: SearchQuery
): Promise<SearchResult> {
  const startTime = Date.now();
  const topK = query.topK ?? RAG_CONSTANTS.DEFAULT_TOP_K;
  const minScore = query.minScore ?? RAG_CONSTANTS.DEFAULT_MIN_SCORE;

  // Step 1: Generate query embedding
  console.log(`[RAG/Retrieval] Embedding query: "${query.query.slice(0, 50)}..."`);
  const queryEmbedding = await embedText(
    { geminiApiKey: deps.geminiApiKey },
    query.query
  );

  // Step 2: Build Vectorize filter
  const filter: Record<string, string | number> = {};
  if (query.moduleId) {
    filter.moduleId = query.moduleId;
  }
  if (query.videoId) {
    filter.videoId = query.videoId;
  }

  // Step 3: Query Vectorize
  console.log(`[RAG/Retrieval] Querying Vectorize with topK=${topK * 2}`);
  const vectorResults = await deps.vectorize.query(queryEmbedding, {
    topK: topK * 2, // Fetch extra for score filtering
    returnMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  // Step 4: Filter by minimum score
  const filteredMatches = vectorResults.matches.filter((m) => m.score >= minScore);
  const topMatches = filteredMatches.slice(0, topK);

  if (topMatches.length === 0) {
    console.log(`[RAG/Retrieval] No matches above score threshold ${minScore}`);
    return {
      chunks: [],
      query: query.query,
      totalFound: 0,
      searchTimeMs: Date.now() - startTime,
    };
  }

  // Step 5: Fetch chunk content from D1
  const chunkIds = topMatches.map((m) => m.id);
  console.log(`[RAG/Retrieval] Fetching ${chunkIds.length} chunks from D1`);

  const dbChunks = await deps.db
    .select()
    .from(transcriptChunks)
    .where(inArray(transcriptChunks.id, chunkIds));

  // Step 6: Build result with scores
  const chunkMap = new Map(dbChunks.map((c) => [c.id, c]));
  const results: RetrievedChunk[] = topMatches
    .map((match) => {
      const dbChunk = chunkMap.get(match.id);
      if (!dbChunk) return null;

      return {
        id: dbChunk.id,
        videoId: dbChunk.videoId,
        moduleId: dbChunk.moduleId,
        chunkIndex: dbChunk.chunkIndex,
        content: dbChunk.content,
        tokenCount: dbChunk.tokenCount,
        startTime: dbChunk.startTime,
        endTime: dbChunk.endTime,
        metadata: parseMetadata(dbChunk.metadata),
        score: match.score,
      };
    })
    .filter((c): c is RetrievedChunk => c !== null);

  const searchTimeMs = Date.now() - startTime;
  console.log(`[RAG/Retrieval] Found ${results.length} chunks in ${searchTimeMs}ms`);

  return {
    chunks: results,
    query: query.query,
    totalFound: results.length,
    searchTimeMs,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse JSON metadata safely.
 */
function parseMetadata(metadataJson: string | null): ChunkMetadata {
  if (!metadataJson) {
    return {
      segmentIds: [],
      avgConfidence: 0,
      language: 'unknown',
    };
  }

  try {
    return JSON.parse(metadataJson) as ChunkMetadata;
  } catch {
    return {
      segmentIds: [],
      avgConfidence: 0,
      language: 'unknown',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a specific chunk by ID.
 */
export async function getChunkById(
  deps: Pick<RetrievalDeps, 'db'>,
  chunkId: string
): Promise<RetrievedChunk | null> {
  const [chunk] = await deps.db
    .select()
    .from(transcriptChunks)
    .where(eq(transcriptChunks.id, chunkId))
    .limit(1);

  if (!chunk) return null;

  return {
    id: chunk.id,
    videoId: chunk.videoId,
    moduleId: chunk.moduleId,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    tokenCount: chunk.tokenCount,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
    metadata: parseMetadata(chunk.metadata),
    score: 1, // No score for direct lookup
  };
}

/**
 * Get all chunks for a video (for debugging/display).
 */
export async function getChunksForVideo(
  deps: Pick<RetrievalDeps, 'db'>,
  videoId: string
): Promise<RetrievedChunk[]> {
  const chunks = await deps.db
    .select()
    .from(transcriptChunks)
    .where(eq(transcriptChunks.videoId, videoId))
    .orderBy(transcriptChunks.chunkIndex);

  return chunks.map((chunk) => ({
    id: chunk.id,
    videoId: chunk.videoId,
    moduleId: chunk.moduleId,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    tokenCount: chunk.tokenCount,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
    metadata: parseMetadata(chunk.metadata),
    score: 1,
  }));
}
