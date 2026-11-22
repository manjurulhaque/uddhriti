/**
 * Resilient HTTP Fetch Utility (CWE-400 Defense)
 *
 * Enforces a strict timeout on outbound third-party HTTP requests to prevent
 * server thread starvation and socket pool exhaustion when external APIs
 * (e.g. Google Books, Gutendex, Library of Congress, OpenLibrary, VIAF, Wikimedia)
 * hang, stall, or undergo outages.
 */

export const DEFAULT_FETCH_TIMEOUT_MS = 10_000

export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const combinedSignal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal

  return fetch(input, {
    ...init,
    signal: combinedSignal,
  })
}

