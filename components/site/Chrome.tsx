"use client";

import Link from "next/link";

export function Arrow({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 11L11 3M11 3H4.6M11 3v6.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteNav() {
  return (
    <header className="site-head">
      <div className="wrap">
        <nav className="site-nav" aria-label="Primary">
          <Link href="/" className="wordmark">
            BidLive<span>.</span>
          </Link>

          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#ledger">The ledger</a>
            <a href="#built">Built on Nexconn</a>
          </div>

          <Link
            href="/app"
            className="btn btn-primary btn-sm"
            style={{ marginLeft: "auto", paddingRight: 8 }}
          >
            Start bidding
            <span className="bii">
              <Arrow />
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFoot() {
  return (
    <footer className="site-foot wrap">
      <span className="wordmark" style={{ fontSize: 18 }}>
        BidLive<span>.</span>
      </span>
      <span>© 2026 · Built for the Nexconn Build Challenge</span>
      <div style={{ flex: 1 }} />
      <a href="https://github.com/devbulchandani/bidlive" target="_blank" rel="noreferrer">
        Source
      </a>
      <a href="https://docs.nexconn.ai" target="_blank" rel="noreferrer">
        Nexconn docs
      </a>
      <Link href="/app">Open the app</Link>
    </footer>
  );
}
