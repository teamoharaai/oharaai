import type { AiErrorCode } from './contracts';
import {
  AIEmbeddingError,
  AIEmbeddingKeyMissingError,
  AIEmbeddingRateLimitError,
  AI_ERROR_CODES,
} from './errors';
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MAX_TOKENS,
  EMBEDDING_MIN_WORD_COUNT,
  EMBEDDING_MODEL,
} from './constants';

export type EmbeddingInputType = 'document' | 'query';

const VOYAGE_EMBEDDINGS_URL = 'https://api.voyageai.com/v1/embeddings';
const APPROX_CHARS_PER_TOKEN = 4;
const MAX_BATCH_SIZE = 128;
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;

interface VoyageEmbeddingItem {
  embedding?: unknown;
}

interface VoyageEmbeddingsResponse {
  data?: VoyageEmbeddingItem[];
  detail?: unknown;
  error?: { message?: string; type?: string } | string;
}

interface EmbeddingLogEvent {
  event: 'embedding_call';
  model: string;
  input_type: EmbeddingInputType;
  input_length: number;
  dimension: number;
  batch_size: number;
  latency_ms: number;
  status: 'success' | 'error';
  error_code: AiErrorCode | null;
  timestamp: string;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  inputType: EmbeddingInputType;
  dimensions: number;
  latencyMs: number;
}

function emitEmbeddingLog(event: EmbeddingLogEvent) {
  console.log(JSON.stringify(event));
}

function getVoyageApiKey() {
  const apiKey = process.env.VOYAGE_API_KEY;

  if (!apiKey) {
    throw new AIEmbeddingKeyMissingError();
  }

  return apiKey;
}

function countWords(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function truncateForEmbedding(text: string) {
  const trimmed = text.trim();
  const maxChars = EMBEDDING_MAX_TOKENS * APPROX_CHARS_PER_TOKEN;

  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars)}...`;
}

function normalizeInput(text: string) {
  const wordCount = countWords(text);

  if (wordCount < EMBEDDING_MIN_WORD_COUNT) {
    return null;
  }

  return truncateForEmbedding(text);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(status: number, payload: VoyageEmbeddingsResponse | null) {
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }

  if (payload?.error && typeof payload.error === 'object' && typeof payload.error.message === 'string') {
    return payload.error.message;
  }

  if (typeof payload?.detail === 'string' && payload.detail.trim()) {
    return payload.detail.trim();
  }

  return `Voyage embedding request failed with status ${status}`;
}

function parseResponsePayload(raw: string): VoyageEmbeddingsResponse | null {
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as VoyageEmbeddingsResponse;
  } catch {
    return null;
  }
}

function validateEmbedding(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new AIEmbeddingError('Voyage embedding response was missing an embedding array.');
  }

  if (value.length !== EMBEDDING_DIMENSIONS) {
    throw new AIEmbeddingError(
      `Voyage embedding response returned ${value.length} dimensions; expected ${EMBEDDING_DIMENSIONS}.`,
    );
  }

  if (!value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    throw new AIEmbeddingError('Voyage embedding response contained non-numeric values.');
  }

  return value;
}

function classifyEmbeddingError(error: unknown): AiErrorCode {
  if (error != null && typeof error === 'object' && 'code' in error) {
    return (error as { code: AiErrorCode }).code;
  }

  return AI_ERROR_CODES.embeddingFailed;
}

async function fetchEmbeddingsBatch(
  texts: string[],
  inputType: EmbeddingInputType,
): Promise<EmbeddingResult[]> {
  const callStart = Date.now();
  const inputLength = texts.reduce((total, text) => total + text.length, 0);

  try {
    const apiKey = getVoyageApiKey();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(VOYAGE_EMBEDDINGS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: texts,
            input_type: inputType,
            output_dimension: EMBEDDING_DIMENSIONS,
          }),
          signal: controller.signal,
        });

        const rawBody = await response.text();
        const payload = parseResponsePayload(rawBody);

        if (response.status === 429) {
          throw new AIEmbeddingRateLimitError(extractErrorMessage(response.status, payload));
        }

        if (!response.ok) {
          const error = new AIEmbeddingError(extractErrorMessage(response.status, payload));

          if (response.status >= 500 && attempt === 0) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }

          throw error;
        }

        const items = payload?.data;
        if (!Array.isArray(items) || items.length !== texts.length) {
          throw new AIEmbeddingError('Voyage embedding response returned an unexpected item count.');
        }

        const latencyMs = Date.now() - callStart;
        const results = items.map((item) => ({
          embedding: validateEmbedding(item?.embedding),
          model: EMBEDDING_MODEL,
          inputType,
          dimensions: EMBEDDING_DIMENSIONS,
          latencyMs,
        }));

        emitEmbeddingLog({
          event: 'embedding_call',
          model: EMBEDDING_MODEL,
          input_type: inputType,
          input_length: inputLength,
          dimension: EMBEDDING_DIMENSIONS,
          batch_size: texts.length,
          latency_ms: latencyMs,
          status: 'success',
          error_code: null,
          timestamp: new Date().toISOString(),
        });

        return results;
      } catch (error) {
        const isAbort = error instanceof Error && error.name === 'AbortError';
        const isRetryableNetworkError =
          (error instanceof TypeError || isAbort) && !(error instanceof AIEmbeddingRateLimitError);

        if (attempt === 0 && isRetryableNetworkError) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }

        if (isAbort) {
          throw new AIEmbeddingError(`Voyage embedding request timed out after ${REQUEST_TIMEOUT_MS}ms`);
        }

        if (error instanceof AIEmbeddingError || error instanceof AIEmbeddingRateLimitError) {
          throw error;
        }

        throw new AIEmbeddingError(
          error instanceof Error ? error.message : 'Voyage embedding request failed unexpectedly.',
        );
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw new AIEmbeddingError('Voyage embedding request failed after retry.');
  } catch (error) {
    emitEmbeddingLog({
      event: 'embedding_call',
      model: EMBEDDING_MODEL,
      input_type: inputType,
      input_length: inputLength,
      dimension: EMBEDDING_DIMENSIONS,
      batch_size: texts.length,
      latency_ms: Date.now() - callStart,
      status: 'error',
      error_code: classifyEmbeddingError(error),
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

export async function generateEmbedding(
  text: string,
  inputType: EmbeddingInputType,
): Promise<number[] | null> {
  const results = await generateEmbeddings([text], inputType);
  return results[0] ?? null;
}

export async function generateEmbeddings(
  texts: string[],
  inputType: EmbeddingInputType,
): Promise<(number[] | null)[]> {
  const normalizedTexts = texts.map((text) => normalizeInput(text));
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const embeddableEntries = normalizedTexts.flatMap((text, index) => (text ? [{ index, text }] : []));

  for (let offset = 0; offset < embeddableEntries.length; offset += MAX_BATCH_SIZE) {
    const batchEntries = embeddableEntries.slice(offset, offset + MAX_BATCH_SIZE);
    const batchResults = await fetchEmbeddingsBatch(
      batchEntries.map((entry) => entry.text),
      inputType,
    );

    batchEntries.forEach((entry, batchIndex) => {
      results[entry.index] = batchResults[batchIndex]?.embedding ?? null;
    });
  }

  return results;
}
