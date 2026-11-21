"use client";

import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/LotIcon";

export function SiteNav() {
  return (
    <header className="site-head">
      <div className="wrap">
        <nav className="site-nav" aria-label="Primary">
          <Link href="/" className="brand">
            <span className="brand-mark">B</span>
            BidLive
          </Link>

          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#ledger">The ledger</a>
            <a href="#built">Built on Nexconn</a>
          </div>

          <Link href="/app" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>
            Start bidding
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFoot() {
  return (
    <footer className="wrap site-foot">
      <Link href="/" className="brand" style={{ fontSize: 15 }}>
        <span className="brand-mark" style={{ width: 22, height: 22, fontSize: 11 }}>
          B
        </span>
        BidLive
      </Link>
      <span>© 2026 · Nexconn Build Challenge</span>
      <div style={{ flex: 1 }} />
      <a href="https://github.com/devbulchandani/bidlive" target="_blank" rel="noreferrer">
        Source
      </a>
      <a href="https://docs.nexconn.ai" target="_blank" rel="noreferrer">
        Docs
      </a>
      <a
        href="https://commons.wikimedia.org"
        target="_blank"
        rel="noreferrer"
        title="Lot photography: Wikimedia Commons (CC0 / CC BY-SA / public domain)"
      >
        Photo credits
      </a>
      <Link href="/app">Open the app</Link>
    </footer>
  );
}

export function StartButton({ label = "Start bidding" }: { label?: string }) {
  return (
    <Link href="/app" className="btn btn-primary">
      {label}
      <span className="bii">
        <ArrowUpRight />
      </span>
    </Link>
  );
}
