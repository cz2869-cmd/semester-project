import { PlayPageClient } from "@/components/play/play-page-client";
import { createClient } from "@/utils/supabase/server";

export default async function PlayPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "You";

  if (user && user.app_metadata?.provider !== "anonymous") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    displayName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      user.email?.split("@")[0] ||
      "You";
  }

  return <PlayPageClient displayName={displayName} />;
}
