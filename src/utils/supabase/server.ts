import { createServerClient } from "@supabase/ssr";
import { getSupabaseAuthCookieOptions } from "@/utils/supabase/authCookies";
import { getSupabasePublicEnv } from "@/utils/supabase/env";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();
  const supabaseEnv = getSupabasePublicEnv();

  if (!supabaseEnv) {
    throw new Error(
      "Missing env variables. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (Production + Preview), " +
        "then Redeploy. Values must match .env.local."
    );
  }

  return createServerClient(supabaseEnv.url, supabaseEnv.key, {
    cookieOptions: getSupabaseAuthCookieOptions(supabaseEnv.url),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (error) {
          console.error("Error setting cookies:", error);
        }
      },
    },
  });
};
