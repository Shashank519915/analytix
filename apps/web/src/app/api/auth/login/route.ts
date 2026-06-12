import { NextResponse } from "next/server";
import { z } from "zod";
import { loginSchema } from "@Shashank519915/analytix-core";
import { getAccountByEmail, verifyPassword } from "@analytix/db";
import {
  AuthError,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const account = await getAccountByEmail(body.email);

    if (!account || !verifyPassword(body.password, account.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSessionToken(account.id);
    const { password_hash: _passwordHash, ...safeAccount } = account;

    const response = NextResponse.json({ account: safeAccount });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
