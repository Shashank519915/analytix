import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { AccountRecord, SiteRecord } from "@analytix/core";
import { getAccountById, getSiteByApiSecret, getSiteById } from "@analytix/db";

export const SESSION_COOKIE = "analytix_session";

export interface SessionPayload {
  accountId: string;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(accountId: string): Promise<string> {
  return new SignJWT({ accountId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const accountId = payload.accountId;
    if (typeof accountId !== "string" || !accountId) return null;
    return { accountId };
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAccountSession(): Promise<AccountRecord> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new AuthError("Unauthorized");
  }

  const account = await getAccountById(session.accountId);
  if (!account) {
    throw new AuthError("Unauthorized");
  }

  return account;
}

export async function getSessionFromRequest(
  request: NextRequest | Request
): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (!match) return null;
  const token = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  return verifySessionToken(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

function extractApiSecret(request: Request): string | null {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7).trim() || null;
  }
  return request.headers.get("x-analytix-api-secret");
}

export async function authorizeSiteAccess(
  request: Request,
  siteId: string
): Promise<SiteRecord | null> {
  const apiSecret = extractApiSecret(request);
  if (apiSecret) {
    const site = await getSiteByApiSecret(apiSecret);
    if (site?.id === siteId) return site;
  }

  const session = await getSessionFromRequest(request);
  if (!session) return null;

  const site = await getSiteById(siteId);
  if (!site || site.account_id !== session.accountId) return null;
  return site;
}

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}
