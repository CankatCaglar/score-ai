import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notifications/repository";
import {
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications/types";

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const preferences = await getNotificationPreferences(ownerEmail);
    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    console.error("[notification-preferences GET]", error);
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      preferences?: Partial<NotificationPreferences>;
    };
    const preferences = await saveNotificationPreferences(
      ownerEmail,
      normalizeNotificationPreferences(body.preferences),
    );
    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    console.error("[notification-preferences PUT]", error);
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }
}
