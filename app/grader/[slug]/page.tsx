import { redirect } from "next/navigation";
import { getCurrentUserSession } from "@/actions/auth";
import { GraderReportClient } from "../GraderReportClient";

export default async function GraderScorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getCurrentUserSession();
  if (session?.email && session.emailVerified) {
    redirect("/dashboard/yeni-analiz");
  }

  const { slug } = await params;
  if (!slug?.trim()) {
    redirect("/grader");
  }

  return <GraderReportClient slug={slug.trim()} />;
}
