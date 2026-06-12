import { getDb } from "./client";
import { firstRow, asRows } from "./rows";
import { hashPassword } from "./password";
import type { AccountRecord } from "@analytix/core";

export async function createAccount(
  email: string,
  password: string,
  name?: string
): Promise<AccountRecord> {
  const sql = getDb();
  const password_hash = hashPassword(password);
  const rows = await sql`
    INSERT INTO accounts (email, password_hash, name)
    VALUES (${email.toLowerCase()}, ${password_hash}, ${name ?? null})
    RETURNING id, email, name, created_at
  `;
  return firstRow<AccountRecord>(rows)!;
}

export async function getAccountByEmail(email: string): Promise<
  (AccountRecord & { password_hash: string }) | null
> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, email, name, password_hash, created_at
    FROM accounts WHERE email = ${email.toLowerCase()} LIMIT 1
  `;
  return firstRow<AccountRecord & { password_hash: string }>(rows) ?? null;
}

export async function getAccountById(id: string): Promise<AccountRecord | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, email, name, created_at FROM accounts WHERE id = ${id}::uuid LIMIT 1
  `;
  const row = firstRow<Record<string, unknown>>(rows);
  if (!row) return null;
  const createdAt = row.created_at;
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string | null) ?? null,
    created_at:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === "string"
          ? createdAt
          : String(createdAt ?? ""),
  };
}
