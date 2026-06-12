"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="emptyState">
      <h2>Something went wrong</h2>
      <p>{error.message || "Could not load this page."}</p>
      <button type="button" className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
