/**
 * Environment Configuration Validator & Safe Accessor
 *
 * Enforces fail-fast configuration validation for critical infrastructure
 * (Database, Supabase Auth) on startup without ever leaking credentials or secrets.
 */

/**
 * Validates and retrieves the PostgreSQL connection string.
 * Fails fast with a clean error message that NEVER prints connection strings or credentials.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()

  if (!url) {
    throw new Error(
      "[Security Configuration Error] Missing DATABASE_URL environment variable. Ensure the PostgreSQL connection string is configured."
    )
  }

  const isValidPostgres =
    url.startsWith("postgres://") ||
    url.startsWith("postgresql://")

  if (!isValidPostgres) {
    throw new Error(
      "[Security Configuration Error] Malformed DATABASE_URL: connection string must start with 'postgres://' or 'postgresql://'."
    )
  }

  return url
}

/**
 * Validates and retrieves Supabase API configuration.
 * Fails fast if the URL or Anon key is missing or malformed.
 */
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url) {
    throw new Error(
      "[Security Configuration Error] Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
    )
  }

  const isLocalDev =
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1")

  if (!url.startsWith("https://") && !isLocalDev) {
    throw new Error(
      "[Security Configuration Error] NEXT_PUBLIC_SUPABASE_URL must use HTTPS protocol in production."
    )
  }

  if (!anonKey) {
    throw new Error(
      "[Security Configuration Error] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
    )
  }

  if (anonKey.length < 20) {
    throw new Error(
      "[Security Configuration Error] NEXT_PUBLIC_SUPABASE_ANON_KEY appears invalid or truncated (must be at least 20 characters)."
    )
  }

  return { url, anonKey }
}

/**
 * Validates all required environment variables on boot.
 */
export function validateEnvironmentOnStartup(): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    getDatabaseUrl()
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }

  try {
    getSupabaseConfig()
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

