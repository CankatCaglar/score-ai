import { after, NextResponse } from "next/server";
import { hasAdminSessionFromCookieHeader } from "@/lib/admin-auth";
import { getVerifiedUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  assertCanCreateAnalysis,
  consumeFreeAnalysis,
} from "@/lib/analysis/credits";
import { runAnalysisJobSubmission } from "@/lib/analysis/submit-job";
import {
  listAnalysesByGuestId,
  processPendingAnalysisJobs,
} from "@/lib/analysis/repository";
import { assertGraderApiAccess } from "@/lib/grader/access";
import {
  isValidGraderContactEmail,
  normalizeGraderContactEmail,
} from "@/lib/grader/email";
import { upsertGraderLead } from "@/lib/grader/leads";
import {
  GRADER_GUEST_COOKIE_NAME,
  GRADER_GUEST_TTL_SECONDS,
  GRADER_LOCK_COOKIE_NAME,
  GRADER_LOCK_TTL_SECONDS,
  createGraderGuestId,
  createGraderGuestToken,
  getGraderGuestIdFromCookieHeader,
  getGraderLockSubjectFromCookieHeader,
  createGraderLockToken,
  guestOwnerEmail,
} from "@/lib/grader-auth";

function scheduleAnalysisProcessing() {
  after(async () => {
    try {
      await processPendingAnalysisJobs(1);
    } catch (error) {
      console.error(
        "[grader/jobs] background processPendingAnalysisJobs failed",
        error instanceof Error ? error.message : error,
      );
    }
  });
}

const ipHits = new Map<string, { count: number; resetAt: number }>();
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_HITS = 8;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowIp(ip: string): boolean {
  const now = Date.now();
  const current = ipHits.get(ip);
  if (!current || current.resetAt <= now) {
    ipHits.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  if (current.count >= IP_MAX_HITS) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!assertGraderApiAccess(cookieHeader)) {
    return NextResponse.json({ error: "GRADER_CLOSED" }, { status: 403 });
  }

  const isAdmin = hasAdminSessionFromCookieHeader(cookieHeader);

  if (!isAdmin && !allowIp(clientIp(request))) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Çok fazla istek. Lütfen daha sonra tekrar deneyin.",
      },
      { status: 429 },
    );
  }

  // Admin cookie erişim kapısıdır; Grader'da "giriş yapmış kullanıcı" sayılmaz.
  // Böylece waitlist'te admin gerçek guest akışını tekrar tekrar test edebilir.
  const loggedInEmail = getVerifiedUserEmailFromCookieHeader(cookieHeader);
  const graderLockSubject = getGraderLockSubjectFromCookieHeader(cookieHeader);
  const formData = await request.formData();

  if (loggedInEmail) {
    if (!isAdmin) {
      try {
        await assertCanCreateAnalysis(loggedInEmail);
      } catch (error) {
        if (error instanceof Error && error.name === "NO_FREE_ANALYSES") {
          return NextResponse.json(
            {
              error: "NO_FREE_ANALYSES",
              message:
                "Ücretsiz analiz hakkınızı kullandınız. Dashboard'dan planınızı kontrol edin.",
            },
            { status: 402 },
          );
        }
        throw error;
      }
    }

    const result = await runAnalysisJobSubmission({
      ownerEmail: loggedInEmail,
      formData,
      waitForCompletion: false,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: result.status },
      );
    }

    if (!result.reused) {
      scheduleAnalysisProcessing();
    }
    if (!isAdmin) {
      await consumeFreeAnalysis(loggedInEmail);
    }

    const response = NextResponse.json(
      {
        ok: true,
        mode: "authenticated",
        jobId: result.jobId,
        analysisId: result.analysisId,
        slug: result.slug,
        jobStatus: result.jobStatus,
        reused: Boolean(result.reused),
      },
      { status: result.status },
    );

    if (!isAdmin) {
      response.cookies.set(
        GRADER_LOCK_COOKIE_NAME,
        createGraderLockToken(loggedInEmail),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: GRADER_LOCK_TTL_SECONDS,
        },
      );
      response.cookies.delete(GRADER_GUEST_COOKIE_NAME);
    }
    return response;
  }

  const existingGuestId = getGraderGuestIdFromCookieHeader(cookieHeader);
  if (graderLockSubject && !isAdmin) {
    const lockedExisting = existingGuestId
      ? await listAnalysesByGuestId(existingGuestId)
      : [];
    const lockedPrimary =
      lockedExisting.find((item) => item.jobStatus === "completed") ??
      lockedExisting[0];
    return NextResponse.json(
      {
        error: "FREE_ALREADY_USED",
        message:
          "Ücretsiz analiz hakkınız bu tarayıcıda kullanıldı. Devam etmek için hesabınıza giriş yapın.",
        analysisId: lockedPrimary?.id,
        slug: lockedPrimary?.slug,
      },
      { status: 402 },
    );
  }

  let guestId = existingGuestId;
  let issueGuestCookie = false;
  if (!guestId) {
    guestId = createGraderGuestId();
    issueGuestCookie = true;
  }

  // Admin test: her seferinde taze guest kimliği — eski 1-analiz kaydına takılma.
  if (isAdmin) {
    guestId = createGraderGuestId();
    issueGuestCookie = true;
  }

  const existing = isAdmin ? [] : await listAnalysesByGuestId(guestId);
  const primary =
    existing.find((item) => item.jobStatus === "completed") ?? existing[0];

  if (existing.length >= 1) {
    const response = NextResponse.json(
      {
        error: "GUEST_LIMIT",
        message:
          "Ücretsiz analiz hakkınızı kullandınız. Sonucu hesabınıza aktarmak için kaydolun veya giriş yapın.",
        analysisId: primary?.id,
        slug: primary?.slug,
      },
      { status: 402 },
    );
    response.cookies.set(
      GRADER_LOCK_COOKIE_NAME,
      createGraderLockToken(`guest:${guestId}`),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GRADER_LOCK_TTL_SECONDS,
      },
    );
    return response;
  }

  const contactEmail = normalizeGraderContactEmail(
    String(formData.get("email") ?? ""),
  );
  if (!isValidGraderContactEmail(contactEmail)) {
    return NextResponse.json(
      {
        error: "EMAIL_REQUIRED",
        message: "Analiz için geçerli bir e-posta adresi gerekli.",
      },
      { status: 400 },
    );
  }

  const locale = String(formData.get("locale") ?? "tr");
  const ownerEmail = guestOwnerEmail(guestId);
  const result = await runAnalysisJobSubmission({
    ownerEmail,
    formData,
    guestId,
    contactEmail,
    locale,
    waitForCompletion: false,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  try {
    await upsertGraderLead({
      email: contactEmail,
      locale,
      guestId,
      analysisId: result.analysisId,
      slug: result.slug,
    });
  } catch (error) {
    console.error(
      "[grader/jobs] upsertGraderLead failed",
      error instanceof Error ? error.message : error,
    );
  }

  if (!result.reused) {
    scheduleAnalysisProcessing();
  }

  const response = NextResponse.json(
    {
      ok: true,
      mode: "guest",
      jobId: result.jobId,
      analysisId: result.analysisId,
      slug: result.slug,
      jobStatus: result.jobStatus,
      reused: Boolean(result.reused),
    },
    { status: result.status },
  );

  // Normal kullanıcı: kilitle. Admin: kilitleme — tekrar test edebilsin.
  if (!isAdmin) {
    response.cookies.set(
      GRADER_LOCK_COOKIE_NAME,
      createGraderLockToken(`guest:${guestId}`),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GRADER_LOCK_TTL_SECONDS,
      },
    );
  } else {
    response.cookies.delete(GRADER_LOCK_COOKIE_NAME);
  }

  if (issueGuestCookie) {
    response.cookies.set(GRADER_GUEST_COOKIE_NAME, createGraderGuestToken(guestId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GRADER_GUEST_TTL_SECONDS,
    });
  }

  return response;
}
