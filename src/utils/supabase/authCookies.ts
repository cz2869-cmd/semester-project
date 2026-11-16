// Each app needs a separate session, including when localhost ports share cookies.
export const getSupabaseAuthCookieOptions = (supabaseUrl: string) => {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    if (projectRef) {
      return { name: `sb-${projectRef}-funnybone-auth-token` };
    }
  } catch {
    // Fall through to a stable default when the env URL is missing/invalid.
  }

  return { name: "sb-funnybone-auth-token" };
};
