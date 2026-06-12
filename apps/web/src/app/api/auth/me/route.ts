import { NextResponse } from "next/server";
import { AuthError, requireAccountSession } from "@/lib/auth";

export async function GET() {
  try {
    const account = await requireAccountSession();
    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[auth/me]", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
