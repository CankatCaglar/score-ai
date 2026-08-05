/** Same-origin media routes must stream bytes (`?download=1`) — GCS redirects fail CORS blob downloads. */
export function withDownloadParam(url: string): string {
  if (!url.startsWith("/api/dashboard/media/") &&
      !url.startsWith("/api/dashboard/potential-media/")) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}download=1`;
}

export async function triggerDownload(url: string, fileName: string) {
  try {
    const response = await fetch(withDownloadParam(url), { cache: "no-store" });
    if (!response.ok) throw new Error("download-failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Last resort: open the streamed/download URL (may still open in-tab for non-API urls).
    window.open(withDownloadParam(url), "_blank", "noopener,noreferrer");
  }
}
