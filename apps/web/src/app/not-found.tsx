import Link from "next/link";

export default function NotFound() {
  return (
    <main className="authPage">
      <div className="authCard stack" style={{ maxWidth: 420 }}>
        <h1 className="authTitle">Page not found</h1>
        <p className="sectionLead">This page does not exist or you no longer have access.</p>
        <div className="pageActions">
          <Link className="btn" href="/dashboard">
            Go to dashboard
          </Link>
          <Link className="btnSecondary" href="/">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
