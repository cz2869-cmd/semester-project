import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { parse } from "tldts";

import type { Database } from "@/types/supabase";

export const SCHOOL_EMAIL_APEX_DOMAINS = ["barnard.edu", "columbia.edu"] as const;

export const SCHOOL_EMAIL_REQUIREMENT_MESSAGE =
  "Use a Barnard or Columbia email (@barnard.edu or @columbia.edu). Google sign-in is not enabled on this project — sign up with email, or enable Email (and Google, if you want it) in Supabase Auth.";

/**
 * Returns the registrable apex domain for a given email or domain string.
 * Uses the public suffix list to correctly handle multi-level TLDs.
 */
export const getApexDomain = (input: string | null | undefined) => {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const candidate = normalized.includes("@")
    ? normalized.split("@")[1] ?? ""
    : normalized;

  if (!candidate) {
    return null;
  }

  const parsed = parse(candidate, { allowPrivateDomains: true });

  return parsed.domain ?? null;
};

export const getEmailApexDomain = (email: string | null | undefined) =>
  getApexDomain(email);

export const isAllowedSchoolEmail = (email: string | null | undefined) => {
  if (!email) {
    return false;
  }

  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    return false;
  }

  const host = trimmed.slice(at + 1);
  if (!host || host.includes(" ") || host.includes("@")) {
    return false;
  }

  return SCHOOL_EMAIL_APEX_DOMAINS.some(
    (apex) => host === apex || host.endsWith(`.${apex}`)
  );
};

type DomainStatus =
  | {
      apexDomain: string;
      isAllowed: boolean;
      error: PostgrestError | null;
    }
  | {
      apexDomain: null;
      isAllowed: false;
      error: PostgrestError | null;
    };

export const resolveEmailDomainStatus = async (
  supabase: SupabaseClient<Database>,
  email: string | null | undefined
): Promise<DomainStatus> => {
  const apexDomain = getEmailApexDomain(email);

  if (!apexDomain) {
    return {
      apexDomain: null,
      isAllowed: false,
      error: null,
    };
  }

  void supabase;

  return {
    apexDomain,
    isAllowed: isAllowedSchoolEmail(email),
    error: null,
  };
};
