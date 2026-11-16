/**
 * Resolve Supabase URL + public key from env.
 * Accepts common Vercel / Supabase integration aliases.
 */
export function getSupabasePublicEnv(): {
  url: string;
  key: string;
} | null {
  const url = firstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL
  );
  const key = firstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY
  );

  if (!url || !key) {
    return null;
  }

  const normalizedUrl = normalizeSupabaseUrl(url);
  if (!normalizedUrl) {
    return null;
  }

  return { url: normalizedUrl, key };
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim().replace(/^['"]|['"]$/g, "");
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Accept bare project URL; strip /rest/v1 if pasted by mistake. */
function normalizeSupabaseUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.endsWith(".supabase.co")) {
      return null;
    }
    return `https://${parsed.hostname}`;
  } catch {
    return null;
  }
}
