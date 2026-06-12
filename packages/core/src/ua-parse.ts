export interface ParsedUserAgent {
  browser: string;
  device_type: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  os: string;
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  const ua = userAgent ?? "";

  if (!ua) {
    return { browser: "Unknown", device_type: "Unknown", os: "Unknown" };
  }

  let device_type: ParsedUserAgent["device_type"] = "Desktop";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) device_type = "Tablet";
  else if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) device_type = "Mobile";

  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";

  let os = "Other";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { browser, device_type, os };
}
