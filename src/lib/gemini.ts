/**
 * Centralized Google Gemini API Client
 * Supports dynamic model selection, fallback handling for 404/503 spikes,
 * and structured JSON generation.
 */

export const DEFAULT_GEMINI_MODELS = [
  process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3.8-flash",
]

export interface GeminiRequestOptions {
  temperature?: number
  signal?: AbortSignal
  model?: string
}

export async function callGeminiGenerateContent(
  apiKey: string,
  prompt: string,
  options?: GeminiRequestOptions
): Promise<Response> {
  const models = options?.model
    ? [options.model]
    : DEFAULT_GEMINI_MODELS

  let lastResponse: Response | null = null

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: options?.temperature ?? 0.2,
            },
          }),
          signal: options?.signal,
        }
      )

      if (response.ok) {
        return response
      }

      lastResponse = response

      // When a model is deprecated (404) or experiencing temporary capacity spikes (503), try the next supported model
      if (response.status === 404 || response.status === 503) {
        continue
      }

      // For auth or validation errors (400, 401, 403), do not cycle through models
      return response
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        throw err
      }
    }
  }

  return lastResponse || new Response(JSON.stringify({ error: "Gemini service unavailable" }), { status: 503 })
}

export async function callGeminiStreamGenerateContent(
  apiKey: string,
  prompt: string,
  options?: GeminiRequestOptions
): Promise<Response> {
  const models = options?.model
    ? [options.model]
    : DEFAULT_GEMINI_MODELS

  let lastResponse: Response | null = null

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options?.temperature ?? 0.3,
            },
          }),
          signal: options?.signal,
        }
      )

      if (response.ok) {
        return response
      }

      lastResponse = response

      if (response.status === 404 || response.status === 503) {
        continue
      }

      return response
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        throw err
      }
    }
  }

  return lastResponse || new Response(JSON.stringify({ error: "Gemini streaming unavailable" }), { status: 503 })
}

