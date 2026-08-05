"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Share2 } from "lucide-react";

type SocialShareMenuProps = {
  title: string;
  url?: string;
  buttonClassName?: string;
};

type ShareTarget = "instagram" | "whatsapp" | "twitter" | "linkedin";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.5" fill="#E1306C" />
      <circle cx="12" cy="12" r="4.15" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17" cy="7" r="1.2" fill="#fff" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path
        d="M12.06 6.6a5.3 5.3 0 0 0-4.5 8.1l-.7 2.5 2.57-.67a5.3 5.3 0 1 0 2.7-9.99Zm0 .95a4.35 4.35 0 0 1 3.69 6.66l-.15.24.42 1.57-1.61-.41-.23.14a4.36 4.36 0 1 1-2.12-8.2Z"
        fill="#fff"
      />
      <path
        d="M14.7 13.35c-.17-.08-1.01-.49-1.16-.54-.16-.06-.27-.08-.38.08-.11.16-.44.54-.54.66-.1.11-.2.13-.37.05-.17-.08-.73-.27-1.39-.87-.52-.46-.87-1.03-.97-1.2-.1-.16-.01-.25.07-.33.08-.08.17-.2.26-.3.09-.1.12-.16.18-.27.06-.11.03-.21-.01-.3-.04-.08-.38-.92-.52-1.26-.14-.33-.29-.28-.38-.28h-.33c-.11 0-.29.04-.44.2-.15.16-.58.57-.58 1.39 0 .82.6 1.6.68 1.71.08.11 1.18 1.8 2.87 2.53.4.17.71.27.96.35.4.13.76.11 1.04.07.32-.05 1.01-.41 1.16-.8.14-.39.14-.72.1-.8-.04-.08-.15-.12-.32-.2Z"
        fill="#fff"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.3" fill="#111827" />
      <path d="m8 7 8 10M16 7l-8 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="3.5" fill="#0A66C2" />
      <circle cx="8.2" cy="8.1" r="1.35" fill="#fff" />
      <rect x="6.9" y="10.1" width="2.6" height="7.1" rx=".45" fill="#fff" />
      <path
        d="M11 10.1h2.45v1.01h.03c.34-.64 1.17-1.31 2.4-1.31 2.56 0 3.03 1.69 3.03 3.88v3.42h-2.57v-3.03c0-.72-.01-1.65-1-1.65-1 0-1.15.78-1.15 1.59v3.09H11v-7.01Z"
        fill="#fff"
      />
    </svg>
  );
}

export function SocialShareMenu({ title, url, buttonClassName }: SocialShareMenuProps) {
  const t = useTranslations("dashboard.share");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shareUrl = useMemo(() => {
    if (url?.startsWith("http")) return url;
    if (url?.startsWith("/")) {
      return typeof window !== "undefined"
        ? `${window.location.origin}${url}`
        : `https://scoreai.app${url}`;
    }
    return url || (typeof window !== "undefined" ? window.location.href : "https://scoreai.app");
  }, [url]);
  const text = useMemo(() => t("createdWith", { title }), [t, title]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1700);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const shareTo = async (target: ShareTarget) => {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(shareUrl);

    if (target === "instagram") {
      await handleCopy();
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      setOpen(false);
      return;
    }

    const targetUrl =
      target === "whatsapp"
        ? `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        : target === "twitter"
          ? `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
          : `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    window.open(targetUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          buttonClassName ??
          "flex items-center gap-1.5 rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5"
        }
      >
        <Share2 className="size-4" strokeWidth={2} />
        {t("button")}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-brand-dark/10 bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={() => void shareTo("instagram")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-brand-dark/80 hover:bg-brand-dark/5"
          >
            <InstagramIcon />
            Instagram
          </button>
          <button
            type="button"
            onClick={() => void shareTo("whatsapp")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-brand-dark/80 hover:bg-brand-dark/5"
          >
            <WhatsAppIcon />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => void shareTo("twitter")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-brand-dark/80 hover:bg-brand-dark/5"
          >
            <TwitterIcon />
            Twitter (X)
          </button>
          <button
            type="button"
            onClick={() => void shareTo("linkedin")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-brand-dark/80 hover:bg-brand-dark/5"
          >
            <LinkedInIcon />
            LinkedIn
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCopy();
              setOpen(false);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg border border-brand-dark/10 px-2.5 py-2 text-left text-sm font-medium text-brand-dark/70 hover:bg-brand-dark/5"
          >
            <Copy className="size-4" strokeWidth={2} />
            {copied ? t("copied") : t("copyLink")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
