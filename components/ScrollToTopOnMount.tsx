"use client";

import { useLayoutEffect } from "react";

/** Force Y=0 before paint; disable browser scroll restoration for this document. */
export function ScrollToTopOnMount() {
  useLayoutEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }, []);

  return null;
}
