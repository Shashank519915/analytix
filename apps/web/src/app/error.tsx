"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="authPage">
      <div className="authCard stack" style={{ maxWidth: 420 }}>
        <h1 className="authTitle">Something went wrong</h1>
        <p className="sectionLead">{error.message || "An unexpected error occurred."}</p>
        <div className="pageActions">
          <button type="button" className="btn" onClick={reset}>
            Try again
          </button>
          <Link className="btnSecondary" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
