"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Keeps media out of the initial HTML/network until near the viewport.
 * HubSpot-style graders count first-load requests; deferred src cuts that tally.
 */
export function useNearViewport(rootMargin = "200px"): {
  ref: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return { ref, visible };
}

export function DeferredMedia({
  className = "",
  style,
  rootMargin,
  placeholder,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  rootMargin?: string;
  /** Shown before the real media mounts (keeps layout stable). */
  placeholder?: ReactNode;
  children: ReactNode;
}) {
  const { ref, visible } = useNearViewport(rootMargin);

  return (
    <div ref={ref} className={className} style={style}>
      {visible ? children : (placeholder ?? null)}
    </div>
  );
}
