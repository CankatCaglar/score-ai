import { NextResponse } from "next/server";

/**
 * Manual @username “connect” disabled.
 * Brand Instagram must be verified via Instagram Login OAuth so users
 * cannot claim someone else’s public handle.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "MANUAL_CONNECT_DISABLED",
      message:
        "Instagram hesabı yalnızca Instagram Login ile bağlanır. Kullanıcı adı yazarak bağlama desteklenmiyor.",
    },
    { status: 410 },
  );
}
