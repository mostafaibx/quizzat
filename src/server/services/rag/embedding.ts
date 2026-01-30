/**
 * Embedding Service
 *
 * Generate embeddings using Google Gemini's text-embedding-004 model.
 * Optimized for multilingual content (Egyptian Arabic + English).
 */

import { type EmbeddingDeps, RAG_CONSTANTS } from './types';

// ============================================================================
// Types
// ============================================================================

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

interface GeminiBatchEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

// ============================================================================
// Embedding Functions
// ============================================================================

/**
 * Generate embedding for a single text.
 */
export async function embedText(deps: EmbeddingDeps, text: string): Promise<number[]> {
  const embeddings = await embedTexts(deps, [text]);
  return embeddings[0];
}

/**
 * Generate embeddings for multiple texts in batches.
 * Uses text-embedding-004 which produces 768-dimensional vectors.
 *
 * @param deps - Service dependencies
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors (768 dimensions each)
 */
export async function embedTexts(deps: EmbeddingDeps, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const results: number[][] = [];
  const totalBatches = Math.ceil(texts.length / RAG_CONSTANTS.EMBEDDING_BATCH_SIZE);

  for (let i = 0; i < texts.length; i += RAG_CONSTANTS.EMBEDDING_BATCH_SIZE) {
    const batchNum = Math.floor(i / RAG_CONSTANTS.EMBEDDING_BATCH_SIZE) + 1;
    const batch = texts.slice(i, i + RAG_CONSTANTS.EMBEDDING_BATCH_SIZE);

    console.log(`[RAG/Embedding] Batch ${batchNum}/${totalBatches}: ${batch.length} texts`);

    const batchEmbeddings = await callGeminiEmbeddings(deps.geminiApiKey, batch);
    results.push(...batchEmbeddings);
  }

  return results;
}

// ============================================================================
// Gemini API
// ============================================================================

const GEMINI_EMBEDDINGS_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Call Gemini embeddings API for a batch of texts.
 * Uses batchEmbedContents for efficiency.
 */
async function callGeminiEmbeddings(apiKey: string, texts: string[]): Promise<number[][]> {
  // For single text, use embedContent
  if (texts.length === 1) {
    const response = await fetch(
      `${GEMINI_EMBEDDINGS_URL}/models/${RAG_CONSTANTS.EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: `models/${RAG_CONSTANTS.EMBEDDING_MODEL}`,
          content: {
            parts: [{ text: texts[0] }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini embeddings API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as GeminiEmbeddingResponse;
    return [data.embedding.values];
  }

  // For multiple texts, use batchEmbedContents
  const response = await fetch(
    `${GEMINI_EMBEDDINGS_URL}/models/${RAG_CONSTANTS.EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${RAG_CONSTANTS.EMBEDDING_MODEL}`,
          content: {
            parts: [{ text }],
          },
        })),
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini embeddings API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GeminiBatchEmbeddingResponse;
  return data.embeddings.map((item) => item.values);
}
