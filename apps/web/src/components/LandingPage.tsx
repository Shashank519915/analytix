import Link from "next/link";

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landingNav">
        <div className="appBrand" style={{ border: 0, margin: 0, padding: 0 }}>
          <div className="appBrandMark">A</div>
          <span className="appBrandName">Analytix</span>
        </div>
        <div className="pageActions">
          <Link className="btnGhost" href="/login">
            Sign in
          </Link>
          <Link className="btn" href="/register">
            Create account
          </Link>
        </div>
      </header>

      <section className="landingHero">
        <h1>Analytics you configure, not inherit.</h1>
        <p>
          Choose what to collect, what to show, and where data lives. Built for operators who
          need clarity without a data warehouse.
        </p>
        <div className="landingActions">
          <Link className="btn" href="/register">
            Start free
          </Link>
          <Link className="btnSecondary" href="/login">
            Sign in
          </Link>
        </div>
      </section>

      <section className="landingBento">
        <article className="landingFeature">
          <h3>Collection profiles</h3>
          <p>Minimal, standard, full, or custom — control events, fields, and sample rate per site.</p>
        </article>
        <article className="landingFeature">
          <h3>Privacy-first ingest</h3>
          <p>IP hashing, path exclusions, consent gates, and origin allowlists enforced at collect time.</p>
        </article>
        <article className="landingFeature">
          <h3>npm SDK</h3>
          <p>
            Install <code>@analytix/react</code> from npm. No GitHub token in CI. Embed the dashboard
            when you need it.
          </p>
        </article>
      </section>
    </div>
  );
}
