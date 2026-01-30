/**
 * Transcription Types
 *
 * Type definitions for the audio transcription service.
 * Designed for Egyptian Arabic with mixed English terms using Google Gemini API.
 */

import { z } from 'zod';

// ============================================================================
// Constants
// ============================================================================

import type { VideoStatus } from './video.types';

// ============================================================================
// OpenAI Whisper API Types
// ============================================================================

/**
 * Whisper API segment from verbose_json response
 */
export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

/**
 * Whisper API word from verbose_json response (with timestamp_granularities)
 */
export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

/**
 * Whisper API verbose_json response structure
 */
export interface WhisperVerboseResponse {
  task: 'transcribe';
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
  words?: WhisperWord[];
}

// ============================================================================
// Stored Transcript Types
// ============================================================================

/**
 * Transcript segment in our stored format
 */
export interface TranscriptSegment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
  confidence: number; // 0-1, derived from avg_logprob
}

/**
 * Transcript word in our stored format
 */
export interface TranscriptWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
}

/**
 * Transcript metadata
 */
export interface TranscriptMetadata {
  model: string;
  processedAt: string; // ISO timestamp
  audioPath: string;
  audioSizeBytes: number;
  processingTimeMs: number;
}

/**
 * Complete transcript data stored in R2
 */
export interface TranscriptData {
  version: '1.0';
  videoId: string;
  language: string; // Requested language (ar)
  detectedLanguage: string; // Language detected by Whisper
  duration: number; // seconds
  text: string; // Full transcript text
  segments: TranscriptSegment[];
  words?: TranscriptWord[];
  metadata: TranscriptMetadata;
}

// ============================================================================
// R2 Path Helpers
// ============================================================================

export const R2_TRANSCRIPT_PATH = {
  transcript: (videoId: string) => `videos/transcripts/${videoId}/transcript.json`,
} as const;

// ============================================================================
// Service Types
// ============================================================================

/**
 * Dependencies for the transcription service
 */
export interface TranscriptionServiceDeps {
  r2Bucket: R2Bucket;
  geminiApiKey: string;
}

/**
 * Dependencies with database for full workflow
 */
export interface TranscriptionServiceDepsWithDb extends TranscriptionServiceDeps {
  db: import('drizzle-orm/d1').DrizzleD1Database;
}

/**
 * Dependencies with RAG indexing support (optional Vectorize)
 */
export interface TranscriptionServiceDepsWithRag extends TranscriptionServiceDepsWithDb {
  vectorize?: VectorizeIndex;
}

/**
 * Input for transcription job
 */
export interface TranscriptionJobInput {
  videoId: string;
  audioPath: string;
  audioDurationSeconds?: number;
  audioSizeBytes?: number;
}

/**
 * Result of transcription operation
 */
export interface TranscriptionResult {
  success: boolean;
  videoId: string;
  transcriptPath?: string;
  error?: string;
  /** The video status after transcription attempt */
  status: VideoStatus;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const transcriptionJobInputSchema = z.object({
  videoId: z.string().min(1),
  audioPath: z.string().min(1),
  audioDurationSeconds: z.number().optional(),
  audioSizeBytes: z.number().optional(),
});

export const triggerTranscriptionSchema = z.object({
  videoId: z.string().min(1),
});

export type TriggerTranscriptionInput = z.infer<typeof triggerTranscriptionSchema>;
