import { createServerClient } from "@supabase/ssr";
import { getSupabaseAuthCookieOptions } from "@/utils/supabase/authCookies";
import { getSupabasePublicEnv } from "@/utils/supabase/env";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/start" || pathname.startsWith("/start/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/start/, "/new");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  const supabaseEnv = getSupabasePublicEnv();

  if (!supabaseEnv) {
    console.error(
      "Middleware: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing or invalid. " +
        `url=${Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)} ` +
        `anon=${Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)} ` +
        `publishable=${Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)}`
    );
    return response;
  }

  try {
    const supabase = createServerClient(supabaseEnv.url, supabaseEnv.key, {
      cookieOptions: getSupabaseAuthCookieOptions(supabaseEnv.url),
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/sign-up") ||
      request.nextUrl.pathname.startsWith("/unauthorized")
    ) {
      return response;
    }

    if (!user) {
      return response;
    }

    if (user.is_anonymous) {
      if (request.nextUrl.pathname === "/new") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      return response;
    }

    return response;
  } catch (error) {
    console.error("Middleware Supabase error:", error);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/new",
  ],
};
