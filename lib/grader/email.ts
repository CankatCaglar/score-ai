const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;

/** 2 harfli ama gerçek TLD olanlar. `co` yok — `gmail.co` yazarken `.com` bitmeden açılmasın. */
const SHORT_TLDS = new Set(["io", "ai", "me", "tv", "app", "dev"]);

export function normalizeGraderContactEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hasCompleteDomain(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  const parts = domain.split(".").filter(Boolean);
  if (parts.length < 2) return false;

  const tld = parts[parts.length - 1] ?? "";
  // com.tr / co.uk gibi çok parçalı uzantılar
  if (parts.length >= 3) {
    const sld = parts[parts.length - 2] ?? "";
    return sld.length >= 2 && tld.length >= 2;
  }

  // Tek TLD: en az 3 harf (.com/.net) — `.co` yazım ortasında kilit kalsın
  if (tld.length >= 3) return true;
  return SHORT_TLDS.has(tld);
}

export function isValidGraderContactEmail(email: string): boolean {
  const normalized = normalizeGraderContactEmail(email);
  if (!EMAIL_RE.test(normalized)) return false;
  // Internal guest adreslerini engelle (node crypto import etmeden)
  if (
    normalized.startsWith("guest:") &&
    normalized.endsWith("@score.guest")
  ) {
    return false;
  }
  if (!hasCompleteDomain(normalized)) return false;
  return true;
}
