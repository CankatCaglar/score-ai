import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

const graderSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Content Analyzer | Ücretsiz İçerik Analizi",
  description:
    "İçeriğini yükle. Score analiz etsin, geliştirme alanlarını açıklasın ve yayına hazır hâle getirsin.",
};

export default function GraderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${graderSans.className} antialiased`}>{children}</div>
  );
}
