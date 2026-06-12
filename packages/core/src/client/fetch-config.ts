import type { PublicSiteConfig } from "../analytics-config";

export async function fetchPublicSiteConfig(
  configUrl: string,
  siteKey: string
): Promise<PublicSiteConfig | null> {
  try {
    const res = await fetch(configUrl, {
      headers: { "X-Analytix-Site-Key": siteKey },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.config ?? null;
  } catch {
    return null;
  }
}
