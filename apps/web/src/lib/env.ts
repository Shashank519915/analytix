const PLACEHOLDER_SECRETS = new Set([
  "change-me-to-a-long-random-string",
  "changeme",
  "secret",
  "your-secret-here",
]);

export function assertProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32 || PLACEHOLDER_SECRETS.has(secret.toLowerCase())) {
    throw new Error(
      "JWT_SECRET must be set to a strong random value (32+ chars) in production."
    );
  }
}
