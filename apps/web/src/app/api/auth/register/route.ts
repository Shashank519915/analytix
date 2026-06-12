import { NextResponse } from "next/server";
import { z } from "zod";
import { registerSchema } from "@Shashank519915/analytix-core";
import { createAccount, getAccountByEmail } from "@analytix/db";
import {
  AuthError,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const existing = await getAccountByEmail(body.email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const account = await createAccount(body.email, body.password, body.name);
    const token = await createSessionToken(account.id);

    const response = NextResponse.json({ account });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid registration payload" }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
