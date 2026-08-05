"use client";

import { getCurrentUserProfile } from "@/actions/profile";
import type { UserProfile } from "@/lib/user-profile";

let cached: UserProfile | undefined;
let inflight: Promise<UserProfile | null> | null = null;

/** Dedupes Strict Mode / remount double calls to the profile server action. */
export async function loadCurrentUserProfileCached(
  opts?: { force?: boolean },
): Promise<UserProfile | null> {
  if (!opts?.force && cached !== undefined) {
    return cached;
  }
  // Always share in-flight work — even on force — so Strict Mode doesn't double-hit.
  if (inflight) {
    return inflight;
  }

  inflight = getCurrentUserProfile()
    .then((data) => {
      // Never stick a null miss in cache — session may appear a moment later
      // (login race, HMR, or a cold cookie), and ayarlar would stay empty forever.
      if (data) {
        cached = data;
      } else {
        cached = undefined;
      }
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateCurrentUserProfileCache() {
  cached = undefined;
  inflight = null;
}

export function setCurrentUserProfileCache(profile: UserProfile | null) {
  cached = profile ?? undefined;
  inflight = null;
}
