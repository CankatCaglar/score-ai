"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Keeps `<html lang>` in sync when navigating between locale segments. */
export function DocumentLocale() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
