/**
 * Transcription Service
 *
 * Isolated service for audio transcription using Google Gemini API.
 * Designed for Egyptian Arabic with mixed English terms.
 *
 * This service is intentionally isolated to enable future migration
 * to a separate Cloudflare Worker.
 */

import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { videos } from '@/db/schema';
import {
  type TranscriptionServiceDeps,
  type TranscriptionServiceDepsWithRag,
  type TranscriptionResult,
  type TranscriptionJobInput,
  type TranscriptData,
  type TranscriptionStatus,
} from '@/types/transcription.types';
import { R2_PATHS } from '@/types/encoding.types';
import { indexVideoTranscript } from '@/server/services/rag';

// ============================================================================
// Constants
// ============================================================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB for inline data

/**
 * Configuration for Egyptian Arabic transcription with English code-switching.
 */
const TRANSCRIPTION_PROMPT = `You are a professional transcriptionist. Transcribe the following audio accurately.

IMPORTANT INSTRUCTIONS:
- The audio is in Egyptian Arabic (اللهجة المصرية) with technical terms in English
- Preserve English technical terms exactly as spoken (e.g., API, function, variable, class, React, JavaScript)
- Include timestamps for each segment of speech
- Output ONLY valid JSON, no markdown formatting

Output the transcription in this exact JSON format:
{
  "language": "ar",
  "duration": <total duration in seconds as number>,
  "text": "<full transcription text>",
  "segments": [
    {
      "id": <segment number starting from 0>,
      "start": <start time in seconds as number>,
      "end": <end time in seconds as number>,
      "text": "<segment text>"
    }
  ]
}

Transcribe the audio now:`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets current timestamp in SQLite format.
 */
function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Parses Gemini's response to extract the transcript JSON.
 */
function parseGeminiResponse(responseText: string): {
  language: string;
  duration: number;
  text: string;
  segments: Array<{ id: number; start: number; end: number; text: string }>;
} {
  // Try to extract JSON from the response (handle potential markdown wrapping)
  let jsonStr = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // If parsing fails, create a simple response with the full text
    console.warn('[Transcription] Failed to parse Gemini response as JSON, using raw text');
    return {
      language: 'ar',
      duration: 0,
      text: responseText,
      segments: [{ id: 0, start: 0, end: 0, text: responseText }],
    };
  }
}

/**
 * Transforms Gemini response to our storage format.
 */
function transformGeminiResponse(
  response: {
    language: string;
    duration: number;
    text: string;
    segments: Array<{ id: number; start: number; end: number; text: string }>;
  },
  videoId: string,
  audioPath: string,
  audioSizeBytes: number,
  processingTimeMs: number
): TranscriptData {
  return {
    version: '1.0',
    videoId,
    language: 'ar',
    detectedLanguage: response.language || 'ar',
    duration: response.duration,
    text: response.text,
    segments: response.segments.map((seg) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text,
      confidence: 0.9, // Gemini doesn't provide confidence scores, use default
    })),
    metadata: {
      model: GEMINI_MODEL,
      processedAt: new Date().toISOString(),
      audioPath,
      audioSizeBytes,
      processingTimeMs,
    },
  };
}

// ============================================================================
// Core Transcription Function
// ============================================================================

/**
 * Transcribes audio using Google Gemini API.
 * This is the core isolated function that can be called from anywhere.
 *
 * @param deps - Service dependencies (R2 bucket and Gemini API key)
 * @param input - Transcription job input (videoId, audioPath, etc.)
 * @returns Transcription result with status and transcript path
 */
export async function transcribeAudio(
  deps: TranscriptionServiceDeps,
  input: TranscriptionJobInput
): Promise<TranscriptionResult> {
  const startTime = Date.now();
  const { videoId, audioPath, audioSizeBytes } = input;

  try {
    // 1. Validate file size if known
    if (audioSizeBytes && audioSizeBytes > MAX_FILE_SIZE_BYTES) {
      console.warn(
        `[Transcription] Audio file too large for video ${videoId}: ${audioSizeBytes} bytes (${Math.round(audioSizeBytes / 1024 / 1024)}MB)`
      );
      return {
        success: false,
        videoId,
        error: `Audio file exceeds 20MB limit (${Math.round(audioSizeBytes / 1024 / 1024)}MB)`,
        status: 'skipped',
      };
    }

    // 2. Fetch audio from R2
    console.log(`[Transcription] Fetching audio for video ${videoId} from ${audioPath}`);
    const audioObject = await deps.r2Bucket.get(audioPath);

    if (!audioObject) {
      console.error(`[Transcription] Audio file not found for video ${videoId} at ${audioPath}`);
      return {
        success: false,
        videoId,
        error: `Audio file not found at ${audioPath}`,
        status: 'failed',
      };
    }

    // 3. Double-check actual file size
    if (audioObject.size > MAX_FILE_SIZE_BYTES) {
      console.warn(
        `[Transcription] Audio file too large for video ${videoId}: ${audioObject.size} bytes (${Math.round(audioObject.size / 1024 / 1024)}MB)`
      );
      return {
        success: false,
        videoId,
        error: `Audio file exceeds 20MB limit (${Math.round(audioObject.size / 1024 / 1024)}MB)`,
        status: 'skipped',
      };
    }

    // 4. Convert R2 stream to base64 for Gemini inline data
    const audioArrayBuffer = await audioObject.arrayBuffer();
    const audioBase64 = btoa(
      new Uint8Array(audioArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Determine MIME type from path
    const mimeType = audioPath.endsWith('.mp3')
      ? 'audio/mp3'
      : audioPath.endsWith('.m4a')
        ? 'audio/mp4'
        : 'audio/wav';

    // 5. Call Gemini API with inline audio data
    console.log(
      `[Transcription] Calling Gemini API for video ${videoId} (${Math.round(audioObject.size / 1024)}KB)`
    );

    const geminiResponse = await fetch(
      `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${deps.geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: TRANSCRIPTION_PROMPT },
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`[Transcription] Gemini API error for video ${videoId}:`, errorText);
      return {
        success: false,
        videoId,
        error: `Gemini API error: ${geminiResponse.status} - ${errorText}`,
        status: 'failed',
      };
    }

    const geminiResult = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      error?: { message: string };
    };

    if (geminiResult.error) {
      console.error(`[Transcription] Gemini API error for video ${videoId}:`, geminiResult.error);
      return {
        success: false,
        videoId,
        error: `Gemini API error: ${geminiResult.error.message}`,
        status: 'failed',
      };
    }

    const responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error(`[Transcription] Empty response from Gemini for video ${videoId}`);
      return {
        success: false,
        videoId,
        error: 'Empty response from Gemini API',
        status: 'failed',
      };
    }

    const processingTimeMs = Date.now() - startTime;

    // 6. Parse and transform response
    const parsedResponse = parseGeminiResponse(responseText);
    const transcript = transformGeminiResponse(
      parsedResponse,
      videoId,
      audioPath,
      audioObject.size,
      processingTimeMs
    );

    // 7. Store transcript in R2
    const transcriptPath = R2_PATHS.transcript(videoId);
    const transcriptJson = JSON.stringify(transcript, null, 2);

    await deps.r2Bucket.put(transcriptPath, transcriptJson, {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        videoId,
        language: transcript.detectedLanguage,
        duration: String(transcript.duration),
      },
    });

    console.log(
      `[Transcription] Completed for video ${videoId} in ${processingTimeMs}ms. ` +
        `Duration: ${Math.round(transcript.duration)}s, Segments: ${transcript.segments.length}`
    );

    return {
      success: true,
      videoId,
      transcriptPath,
      status: 'completed',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Transcription] Failed for video ${videoId}:`, error);

    return {
      success: false,
      videoId,
      error: errorMessage,
      status: 'failed',
    };
  }
}

// ============================================================================
// Database Integration Functions
// ============================================================================

/**
 * Processes transcription for a video and updates the database.
 * Optionally triggers RAG indexing if Vectorize is provided.
 * This is the main entry point for webhook-triggered transcription.
 *
 * @param deps - Service dependencies with database (and optional Vectorize for RAG)
 * @param videoId - The video ID to transcribe
 * @returns Transcription result
 */
export async function processVideoTranscription(
  deps: TranscriptionServiceDepsWithRag,
  videoId: string
): Promise<TranscriptionResult> {
  // 1. Get video record
  const [video] = await deps.db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  if (!video) {
    console.error(`[Transcription] Video not found: ${videoId}`);
    return {
      success: false,
      videoId,
      error: 'Video not found',
      status: 'failed',
    };
  }

  if (!video.sttAudioPath) {
    console.warn(`[Transcription] No STT audio path for video: ${videoId}`);
    return {
      success: false,
      videoId,
      error: 'No STT audio path available',
      status: 'skipped',
    };
  }

  // 2. Update status to processing
  await deps.db
    .update(videos)
    .set({
      transcriptionStatus: 'processing',
      transcriptionError: null,
      updatedAt: now(),
    })
    .where(eq(videos.id, videoId));

  // 3. Perform transcription
  const result = await transcribeAudio(
    { r2Bucket: deps.r2Bucket, geminiApiKey: deps.geminiApiKey },
    {
      videoId,
      audioPath: video.sttAudioPath,
    }
  );

  // 4. Update database with result
  if (result.success) {
    await deps.db
      .update(videos)
      .set({
        transcriptPath: result.transcriptPath,
        transcriptionStatus: 'completed',
        transcriptionError: null,
        updatedAt: now(),
      })
      .where(eq(videos.id, videoId));

    // 5. Trigger RAG indexing if Vectorize is available
    if (deps.vectorize) {
      try {
        console.log(`[Transcription] Triggering RAG indexing for video ${videoId}`);
        const indexResult = await indexVideoTranscript(
          {
            db: deps.db,
            vectorize: deps.vectorize,
            r2Bucket: deps.r2Bucket,
            geminiApiKey: deps.geminiApiKey,
          },
          videoId
        );
        console.log(
          `[Transcription] RAG indexing complete for video ${videoId}: ` +
            `${indexResult.chunksCreated} chunks, ${indexResult.embeddingsStored} embeddings`
        );
      } catch (indexError) {
        // Log error but don't fail the transcription
        console.error(`[Transcription] RAG indexing failed for video ${videoId}:`, indexError);
      }
    }
  } else {
    await deps.db
      .update(videos)
      .set({
        transcriptionStatus: result.status,
        transcriptionError: result.error,
        updatedAt: now(),
      })
      .where(eq(videos.id, videoId));
  }

  return result;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Gets the transcript for a video from R2.
 *
 * @param deps - R2 bucket dependency
 * @param videoId - The video ID
 * @returns Transcript data or null if not found
 */
export async function getTranscript(
  deps: { r2Bucket: R2Bucket },
  videoId: string
): Promise<TranscriptData | null> {
  const transcriptPath = R2_PATHS.transcript(videoId);
  const object = await deps.r2Bucket.get(transcriptPath);

  if (!object) {
    return null;
  }

  const text = await object.text();
  return JSON.parse(text) as TranscriptData;
}

/**
 * Gets transcription status for a video from the database.
 *
 * @param deps - Database dependency
 * @param videoId - The video ID
 * @returns Transcription status information or null if video not found
 */
export async function getTranscriptionStatus(
  deps: { db: DrizzleD1Database },
  videoId: string
): Promise<{
  status: TranscriptionStatus | null;
  transcriptPath: string | null;
  error: string | null;
} | null> {
  const [video] = await deps.db
    .select({
      transcriptionStatus: videos.transcriptionStatus,
      transcriptPath: videos.transcriptPath,
      transcriptionError: videos.transcriptionError,
    })
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  if (!video) {
    return null;
  }

  return {
    status: video.transcriptionStatus as TranscriptionStatus | null,
    transcriptPath: video.transcriptPath,
    error: video.transcriptionError,
  };
}
