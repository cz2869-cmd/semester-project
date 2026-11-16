"use server";

import { createClient } from "@/utils/supabase/server";
import type { PlayRoundImage } from "@/lib/play/types";

const FALLBACK_IMAGE: PlayRoundImage = {
  id: "fallback-loading-1",
  url: "/loading/loading1.png",
};

/**
 * Picks a random common-use image for a Play round.
 * Falls back to a local asset if the library is empty / unavailable.
 */
export async function fetchPlayImageAction(): Promise<PlayRoundImage> {
  const supabase = await createClient();

  try {
    const { count, error: countError } = await supabase
      .from("images")
      .select("id", { count: "exact", head: true })
      .eq("is_common_use", true);

    if (countError || !count || count < 1) {
      return FALLBACK_IMAGE;
    }

    const offset = Math.floor(Math.random() * count);

    const { data, error } = await supabase
      .from("images")
      .select("id, url")
      .eq("is_common_use", true)
      .order("created_datetime_utc", { ascending: false })
      .range(offset, offset)
      .maybeSingle();

    if (error || !data?.id || !data?.url) {
      return FALLBACK_IMAGE;
    }

    return { id: data.id, url: data.url };
  } catch {
    return FALLBACK_IMAGE;
  }
}
