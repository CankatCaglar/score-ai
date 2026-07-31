import { NextResponse } from "next/server";
import { getDashboardUserEmailFromCookieHeader } from "@/lib/analysis/auth";
import {
  deleteNotification,
  listAppNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/repository";

export async function GET(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const data = await listAppNotifications(ownerEmail);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error("[notifications GET]", error);
    return NextResponse.json({ error: "LIST_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      id?: string;
    };

    if (body.action === "read-all") {
      const count = await markAllNotificationsRead(ownerEmail);
      return NextResponse.json({ ok: true, count });
    }

    if (body.action === "read" && body.id) {
      const ok = await markNotificationRead(ownerEmail, body.id);
      if (!ok) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  } catch (error) {
    console.error("[notifications PATCH]", error);
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ownerEmail = getDashboardUserEmailFromCookieHeader(
    request.headers.get("cookie"),
  );
  if (!ownerEmail) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
    }
    const ok = await deleteNotification(ownerEmail, id);
    if (!ok) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notifications DELETE]", error);
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}
