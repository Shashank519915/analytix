"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label,
  onCopied,
}: {
  value: string;
  label?: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btnSecondary copyBtn" onClick={handleCopy}>
      {copied ? "Copied" : (label ?? "Copy")}
    </button>
  );
}
