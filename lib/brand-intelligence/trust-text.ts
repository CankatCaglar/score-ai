function extractStringsFromPdf(buffer: Buffer): string {
  const text = buffer.toString("latin1");
  const chunks: string[] = [];
  const regex = /\((?:\\.|[^\\)])+\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0].slice(1, -1);
    const decoded = raw
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
    const cleaned = decoded.replace(/[^\x20-\x7EğüşıöçĞÜŞİÖÇ\n]/g, " ").trim();
    if (cleaned.length >= 4) chunks.push(cleaned);
    if (chunks.join(" ").length > 4000) break;
  }
  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 4000);
}

export function extractTrustProofText(
  bytes: Buffer,
  contentType: string,
  fileName: string,
): string | null {
  const normalized = contentType.toLowerCase();
  const lowerName = fileName.toLowerCase();
  if (normalized.includes("pdf") || lowerName.endsWith(".pdf")) {
    const extracted = extractStringsFromPdf(bytes);
    return extracted || null;
  }
  return null;
}
