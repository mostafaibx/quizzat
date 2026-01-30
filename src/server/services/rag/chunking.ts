/**
 * Chunking Service
 *
 * Semantic chunking of video transcripts into embedable chunks.
 * Groups consecutive segments by token budget while preserving boundaries.
 */

import type { TranscriptData, TranscriptSegment } from '@/types/transcription.types';
import {
  type TranscriptChunk,
  type ChunkMetadata,
  RAG_CONSTANTS,
  generateChunkId,
} from './types';

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate token count for text.
 * Uses simple heuristic: ~4 characters per token for mixed Arabic/English.
 * More accurate than English-only (~3.5 chars) due to Arabic script.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Chunking Logic
// ============================================================================

/**
 * Chunk a transcript into semantic segments suitable for embedding.
 *
 * Strategy:
 * 1. Group consecutive segments until reaching token budget (~400)
 * 2. Use segment boundaries (never split mid-segment)
 * 3. Overlap last segment with next chunk for context continuity
 * 4. Skip tiny chunks (< 100 tokens) by merging with previous
 *
 * @param transcript - The full transcript data from Whisper
 * @param videoId - The video ID
 * @param moduleId - The module ID for filtering
 * @returns Array of chunks ready for embedding
 */
export function chunkTranscript(
  transcript: TranscriptData,
  videoId: string,
  moduleId: string
): TranscriptChunk[] {
  const { segments } = transcript;

  if (!segments || segments.length === 0) {
    return [];
  }

  const chunks: TranscriptChunk[] = [];
  let currentSegments: TranscriptSegment[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentTokens = estimateTokens(segment.text);

    // Check if adding this segment would exceed the budget
    if (
      currentTokens + segmentTokens > RAG_CONSTANTS.CHUNK_TARGET_TOKENS &&
      currentSegments.length > 0
    ) {
      // Create chunk from accumulated segments
      const chunk = createChunk(
        currentSegments,
        videoId,
        moduleId,
        chunkIndex,
        transcript.detectedLanguage
      );
      chunks.push(chunk);
      chunkIndex++;

      // Overlap: Start next chunk with last segment of current chunk
      const overlapSegment = currentSegments[currentSegments.length - 1];
      currentSegments = [overlapSegment];
      currentTokens = estimateTokens(overlapSegment.text);
    }

    // Add segment to current chunk
    currentSegments.push(segment);
    currentTokens += segmentTokens;
  }

  // Handle remaining segments
  if (currentSegments.length > 0) {
    // Check if it's too small and should be merged with previous
    if (
      currentTokens < RAG_CONSTANTS.CHUNK_MIN_TOKENS &&
      chunks.length > 0
    ) {
      // Merge with previous chunk by extending its content
      const prevChunk = chunks[chunks.length - 1];
      const mergedContent = prevChunk.content + ' ' + combineSegmentText(currentSegments);
      const mergedSegmentIds = [
        ...prevChunk.metadata.segmentIds,
        ...currentSegments.map((s) => s.id),
      ];
      const allConfidences = [
        prevChunk.metadata.avgConfidence,
        ...currentSegments.map((s) => s.confidence),
      ];

      chunks[chunks.length - 1] = {
        ...prevChunk,
        content: mergedContent.trim(),
        tokenCount: estimateTokens(mergedContent),
        endTime: currentSegments[currentSegments.length - 1].end,
        metadata: {
          ...prevChunk.metadata,
          segmentIds: [...new Set(mergedSegmentIds)], // Dedupe
          avgConfidence: average(allConfidences),
        },
      };
    } else {
      // Create final chunk
      const chunk = createChunk(
        currentSegments,
        videoId,
        moduleId,
        chunkIndex,
        transcript.detectedLanguage
      );
      chunks.push(chunk);
    }
  }

  return chunks;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a chunk from a list of segments.
 */
function createChunk(
  segments: TranscriptSegment[],
  videoId: string,
  moduleId: string,
  chunkIndex: number,
  language: string
): TranscriptChunk {
  const content = combineSegmentText(segments);
  const segmentIds = segments.map((s) => s.id);
  const confidences = segments.map((s) => s.confidence);

  return {
    id: generateChunkId(),
    videoId,
    moduleId,
    chunkIndex,
    content: content.trim(),
    tokenCount: estimateTokens(content),
    startTime: segments[0].start,
    endTime: segments[segments.length - 1].end,
    metadata: {
      segmentIds: [...new Set(segmentIds)], // Dedupe in case of overlap
      avgConfidence: average(confidences),
      language,
    },
  };
}

/**
 * Combine segment texts into a single string.
 */
function combineSegmentText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(' ');
}

/**
 * Calculate average of numbers.
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get chunk statistics for debugging/monitoring.
 */
export function getChunkStats(chunks: TranscriptChunk[]): {
  totalChunks: number;
  totalTokens: number;
  avgTokensPerChunk: number;
  avgConfidence: number;
  totalDurationSeconds: number;
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      totalTokens: 0,
      avgTokensPerChunk: 0,
      avgConfidence: 0,
      totalDurationSeconds: 0,
    };
  }

  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
  const avgConfidence = average(chunks.map((c) => c.metadata.avgConfidence));
  const totalDuration = chunks[chunks.length - 1].endTime - chunks[0].startTime;

  return {
    totalChunks: chunks.length,
    totalTokens,
    avgTokensPerChunk: Math.round(totalTokens / chunks.length),
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    totalDurationSeconds: Math.round(totalDuration),
  };
}
