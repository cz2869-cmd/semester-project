"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SCHOOL_EMAIL_REQUIREMENT_MESSAGE } from "@/utils/domain";
import { createClient } from "@/utils/supabase/server";
import { encodedRedirect } from "@/utils/utils";

export const signInWithGoogleAction = async () => {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // Explicitly set the redirect URL to the auth callback endpoint
  const redirectUrl = `${origin}/auth/callback`;

  const { error, data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      // Add any needed query parameters
      queryParams: {
        // Add domain check parameter
        hd: "*", // This will ensure we get the email domain
      },
    },
  });

  if (error) {
    console.error("Error initiating Google sign-in:", error.message);
    const providerDisabled =
      error.message.toLowerCase().includes("provider") ||
      error.message.toLowerCase().includes("validation");
    return encodedRedirect(
      "error",
      "/login",
      providerDisabled
        ? SCHOOL_EMAIL_REQUIREMENT_MESSAGE
        : error.message
    );
  }

  return redirect(data.url);
};
