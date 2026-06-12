import Link from "next/link";

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landingNav">
        <Link className="appBrand landingBrand" href="/">
          <div className="appBrandMark">A</div>
          <span className="appBrandName">Analytix</span>
        </Link>
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
        <p className="eyebrow">Privacy-first analytics platform</p>
        <h1>Measure what matters. Ignore the rest.</h1>
        <p className="landingHeroLead">
          Configure collection profiles, allowed origins, and dashboard widgets per site.
          Ship the npm SDK in minutes — no warehouse required.
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

      <section className="landingBento" aria-label="Platform features">
        <article className="landingFeature landingFeaturePrimary">
          <span className="eyebrow eyebrowInline">Control</span>
          <h3>Collection profiles</h3>
          <p>
            Minimal, standard, full, or custom — choose events, fields, sample rate, and consent
            gates per property.
          </p>
        </article>
        <article className="landingFeature">
          <span className="eyebrow eyebrowInline">Security</span>
          <h3>Origin allowlists</h3>
          <p>Browser requests are rejected unless the origin matches your site configuration.</p>
        </article>
        <article className="landingFeature">
          <span className="eyebrow eyebrowInline">SDK</span>
          <h3>npm packages</h3>
          <p>
            <code>@analytix/react</code> for App Router, <code>@analytix/tracker</code> for vanilla
            JS. Embed <code>@analytix/dashboard</code> when you need charts.
          </p>
        </article>
        <article className="landingFeature landingFeatureWide">
          <span className="eyebrow eyebrowInline">Operator UX</span>
          <h3>Built for people who run sites</h3>
          <p>
            Sites bento grid, per-site settings, integration snippets, and skeleton loading — not a
            marketing dashboard bolted onto a database.
          </p>
        </article>
      </section>

      <footer className="landingFooter">
        <p>Self-hosted platform · Public SDK on npm · Your data in your Neon database</p>
      </footer>
    </div>
  );
}
