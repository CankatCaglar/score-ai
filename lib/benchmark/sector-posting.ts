/** Tek Instagram hesabında aylık ortalama paylaşım referansları. */
export const SECTOR_MONTHLY_POSTING = [
  { sector: "Moda ve giyim", postsPerMonth: 18 },
  { sector: "Güzellik ve kozmetik", postsPerMonth: 20 },
  { sector: "Yeme-içme / restoran", postsPerMonth: 15 },
  { sector: "Spor ve fitness", postsPerMonth: 21 },
  { sector: "Turizm ve seyahat", postsPerMonth: 14 },
  { sector: "Teknoloji ve elektronik", postsPerMonth: 13 },
  { sector: "Eğitim ve online kurslar", postsPerMonth: 11 },
  { sector: "Sağlık ve wellness", postsPerMonth: 13 },
  { sector: "Oyun / e-spor", postsPerMonth: 22 },
  { sector: "E-ticaret ve perakende", postsPerMonth: 18 },
  /** Listede olmayan sektörler için varsayılan */
  { sector: "Diğer", postsPerMonth: 15 },
] as const;

export const DEFAULT_SECTOR_POSTS_PER_MONTH = 15;

/** Tüm sektör referanslarının (Diğer dahil) yuvarlanmış ortalaması. */
export function getCatalogSectorPostingAverage(): number {
  const total = SECTOR_MONTHLY_POSTING.reduce(
    (sum, item) => sum + item.postsPerMonth,
    0,
  );
  return Math.round(total / SECTOR_MONTHLY_POSTING.length);
}

export function resolveSectorPostsPerMonth(sectorName?: string | null): number {
  const normalized = sectorName?.trim().toLowerCase();
  if (!normalized) return DEFAULT_SECTOR_POSTS_PER_MONTH;
  const match = SECTOR_MONTHLY_POSTING.find((item) =>
    normalized.includes(item.sector.toLowerCase().slice(0, 6)),
  );
  return match?.postsPerMonth ?? DEFAULT_SECTOR_POSTS_PER_MONTH;
}
