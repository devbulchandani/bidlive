"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { client } from "@/lib/client/api";
import type { LotSummary } from "@/lib/types";
import { plural, rupee } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { SiteFoot, SiteNav, StartButton } from "@/components/site/Chrome";
import {
  BoltIcon,
  CheckIcon,
  GlobeIcon,
  LedgerIcon,
  ShieldIcon,
} from "@/components/ui/LotIcon";

export default function Landing() {
  const [lots, setLots] = useState<LotSummary[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      client
        .lots()
        .then((res) => {
          if (!alive) return;
          setLots(res.lots);
          setReady(true);
        })
        .catch(() => setReady(true));
    void load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const live = lots.filter((l) => l.status === "live");
  const hero = live[0] ?? lots[0];
  const bids = lots.reduce((n, l) => n + l.bidCount, 0);
  const recent = [...lots].sort((a, b) => b.bidCount - a.bidCount).slice(0, 3);

  return (
    <>
      <SiteNav />

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="wrap hero">
          <span className="hero-badge">
            <i className="dot" style={{ color: "var(--accent)" }} />
            {ready ? `${plural(live.length, "lot")} live right now` : "Live auctions, in your chat"}
          </span>

          <h1>
            The auction is <em>the chat</em>.
          </h1>

          <p className="hero-sub">
            No bidding form, no second tab. The room where people ask about the lot is the same room
            where the price moves — tap a chip or type a number, and the clock and the record are
            settled on the server.
          </p>

          <div className="hero-cta">
            <StartButton />
            <a href="#how" className="btn btn-ghost">
              How it works
            </a>
          </div>

          <div className="proof">
            <div className="faces">
              {["R", "A", "P", "M"].map((f, i) => (
                <span
                  className="face"
                  key={f}
                  style={{ background: ["#e8502a", "#2f6fed", "#1c8b5f", "#0c0c0d"][i] }}
                >
                  {f}
                </span>
              ))}
            </div>
            <span>{plural(bids, "bid")} placed · any name gets you in, no password</span>
          </div>

          {/* real product, not a mockup */}
          <div className="cluster">
            <div className="shot">
              {hero ? (
                <>
                  <img src={hero.image} alt={hero.title} />
                  <div className="veil" />
                  <div className="shot-top">
                    <span className="chip chip-accent" style={{ backdropFilter: "blur(8px)" }}>
                      <i className="dot pulse" />
                      live
                    </span>
                    <span className="chip">{rupee(hero.currentBid)}</span>
                  </div>
                  <div className="shot-bottom">
                    <div className="shot-caption">
                      <div className="label" style={{ marginBottom: 3 }}>
                        On the block
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
                        {hero.title}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="skeleton" style={{ position: "absolute", inset: 0 }} />
              )}
            </div>

            <div className="pane-stack">
              <div className="mini">
                <div className="mini-head">
                  <span>{hero?.bidCount ? "Leading bid" : "Starting price"}</span>
                  <span className="label">
                    {hero?.bidCount ? `${hero.bidCount} bids` : "no bids yet"}
                  </span>
                </div>

                <div className="price-row">
                  <div className="price">{rupee(hero?.currentBid ?? 0)}</div>
                  <div style={{ textAlign: "right" }}>
                    <div className="label" style={{ marginBottom: 4 }}>
                      closes in
                    </div>
                    {hero ? (
                      <Countdown endsAt={hero.endsAt} className="clock" />
                    ) : (
                      <span className="clock">—</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {hero ? (
                    <>
                      <Link
                        href={`/app/${hero.id}`}
                        className="btn btn-accent btn-sm"
                        style={{ padding: "8px 14px" }}
                      >
                        Bid {rupee(hero.nextMin)}
                      </Link>
                      <Link
                        href={`/app/${hero.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "8px 14px" }}
                      >
                        {rupee(hero.nextMin + hero.increment)}
                      </Link>
                    </>
                  ) : null}
                  <Link
                    href={hero ? `/app/${hero.id}` : "/app"}
                    className="hint"
                    style={{ marginLeft: "auto", alignSelf: "center" }}
                  >
                    Enter the room →
                  </Link>
                </div>
              </div>

              <div className="mini" style={{ overflow: "hidden" }}>
                <div className="mini-head">
                  <span>The room</span>
                  <span className="label">as it happens</span>
                </div>
                <div className="ledger">
                  {recent.map((lot, i) => (
                    <div className="ledger-row" key={lot.id}>
                      <span className="tick">
                        <CheckIcon size={10} />
                      </span>
                      <span className="who">{lot.topName ?? lot.sellerName}</span>
                      <span style={{ color: "var(--faint)" }}>
                        {lot.topName ? "bid" : "listed"}
                      </span>
                      <span className="amt">{rupee(lot.currentBid)}</span>
                    </div>
                  ))}
                </div>
                <div className="hint" style={{ marginTop: 2 }}>
                  <LedgerIcon size={14} /> Every bid is a stored message — the transcript is the
                  ledger.
                </div>
              </div>
            </div>
          </div>

          <div className="logos">
            <div className="cap">Built on</div>
            <div className="logo-row">
              <span>Nexconn</span>
              <span>Chat SDK</span>
              <span>Server API</span>
              <span>Push</span>
              <span>Group Channels</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ how */}
        <section className="wrap section" id="how">
          <div className="section-head">
            <span className="badge-dark">
              <BoltIcon size={12} /> How it works
            </span>
            <h2>Three things happen when you tap a number.</h2>
            <p>
              The bid is a message. That one decision is what removes the second tab, the refresh,
              and the argument about who was winning.
            </p>
          </div>

          <div className="feature">
            <div className="feature-copy">
              <h3>You bid where you were already talking.</h3>
              <p>
                <code className="mono">550</code> is a bid. “Is the light meter accurate?” is a
                question. One input does both, so watching a lot and bidding on it is never a
                decision about which tab you are in.
              </p>
              <ul className="bullets">
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  Chips give the next increment in a single tap
                </li>
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  The field still takes a jump bid: say ₹4,000 and mean it
                </li>
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  Both land as the same custom message
                </li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="art-card">
                <div className="art-row">
                  <span
                    className="avatar"
                    style={{ background: "#2f6fed", width: 24, height: 24 }}
                  >
                    P
                  </span>
                  <span className="grow">Does it come with the case?</span>
                </div>
                <div className="art-row solid" style={{ opacity: 0.62 }}>
                  <span className="grow">Arjun</span>
                  <b className="mono" style={{ textDecoration: "line-through" }}>
                    ₹550
                  </b>
                  <span className="badge badge-outbid">outbid</span>
                </div>
                <div className="art-row accent">
                  <span className="grow">Riya</span>
                  <b className="mono">₹620</b>
                  <span className="badge badge-leading">leading</span>
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 2 }}>
                  <span className="bid-chip bid-chip-primary">₹650</span>
                  <span className="bid-chip">₹700</span>
                  <span className="bid-chip">₹800</span>
                </div>
              </div>
            </div>
          </div>

          <div className="feature flip">
            <div className="feature-copy">
              <h3>The server holds the clock, not your laptop.</h3>
              <p>
                Every bid is checked against the lot: is it still open, is it above the minimum, is
                this person allowed to bid at all. A device with the wrong time still sees the right
                countdown, because the number arrives with every push.
              </p>
              <ul className="bullets">
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  A bid inside the final 30 seconds extends the lot by 30
                </li>
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  Capped at five extensions, so it cannot run all night
                </li>
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  The extension is announced in the room, not applied quietly
                </li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="art-card">
                <div className="mini-head">
                  <span>Closes in</span>
                  <span className="label">lot 01</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <span className="clock" style={{ fontSize: 40, color: "var(--accent)" }}>
                    00:29
                  </span>
                  <span className="chip chip-accent">
                    <i className="dot" />
                    +30s
                  </span>
                </div>
                <div className="art-row">
                  <span className="grow">
                    Bid in the final 30 seconds — the clock extends
                  </span>
                </div>
                <div className="bar">
                  <i style={{ width: "72%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="feature">
            <div className="feature-copy">
              <h3>Everyone sees the same card flip.</h3>
              <p>
                Your bid lands as a message. The moment someone beats it, your card turns from
                leading to outbid — in place, in the history, for everyone. The person who was
                leading also gets a push, so they can come back and fight.
              </p>
              <ul className="bullets">
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  No polling, no refresh — the socket does the telling
                </li>
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  Works while the tab is closed, over push
                </li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="art-card">
                <div
                  className="bidcard"
                  style={{ minWidth: 0, width: "100%", justifyContent: "space-between" }}
                >
                  <div>
                    <div className="label">Bid</div>
                    <div className="amount">₹500</div>
                  </div>
                  <span className="badge badge-outbid">outbid</span>
                </div>
                <div
                  className="bidcard leading"
                  style={{ minWidth: 0, width: "100%", justifyContent: "space-between" }}
                >
                  <div>
                    <div className="label">Bid</div>
                    <div className="amount">₹550</div>
                  </div>
                  <span className="badge badge-leading">leading</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- ledger */}
        <section className="band" id="ledger">
          <div className="wrap section">
            <div className="section-head">
              <span className="badge-dark">
                <LedgerIcon size={12} /> The ledger
              </span>
              <h2>An auction is an argument about money.</h2>
              <p>
                “I bid six hundred, you closed early.” Every marketplace has that conversation, and
                almost none can answer it. Here every bid is a stored message in the lot’s channel —
                ordered, timestamped, recoverable months later.
              </p>
            </div>

            <div className="stats">
              <div className="stat">
                <b>180d</b>
                <span>Message history kept by the channel</span>
              </div>
              <div className="stat">
                <b>1</b>
                <span>Place a bid can come from — the message</span>
              </div>
              <div className="stat">
                <b>0</b>
                <span>Forms, tabs or refresh buttons</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- built */}
        <section className="wrap section" id="built">
          <div className="section-head">
            <span className="badge-dark">
              <ShieldIcon size={12} /> Built on Nexconn
            </span>
            <h2>Not a socket we wrote.</h2>
            <p>
              Group channels give us ordered delivery, offline sync and history. The SDK brings push
              and translation. We spent the time on the auction rules instead.
            </p>
          </div>

          <div className="feature">
            <div className="feature-copy">
              <h3>Moderation you can see.</h3>
              <p>
                The auctioneer mutes a shill bidder and their next bid is refused — on the server,
                in public, in the transcript.
              </p>
              <ul className="bullets">
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  Mute, extend and close are auctioneer-only
                </li>
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  Sellers cannot bid on their own lot
                </li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="art-card">
                <div className="art-row">
                  <span className="grow">Riya was muted by the auctioneer</span>
                  <span className="badge badge-outbid">muted</span>
                </div>
                <div className="art-row">
                  <span className="grow">Their next bid</span>
                  <b style={{ color: "var(--accent-ink)" }}>refused</b>
                </div>
              </div>
            </div>
          </div>

          <div className="feature flip">
            <div className="feature-copy">
              <h3>Reach that comes with it.</h3>
              <p>
                Because a bid is a message, it can arrive from anywhere a message can: a second
                device, a translation layer, or a bidding bot working on a maximum you set.
              </p>
              <ul className="bullets">
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  Multi-device sync and offline queue
                </li>
                <li>
                  <span className="b-ico">
                    <CheckIcon size={10} />
                  </span>
                  AI translation and voice-to-text on the same channel
                </li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="art-card">
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <span className="chip">
                    <GlobeIcon size={13} /> हिन्दी
                  </span>
                  <span className="chip">Bahasa</span>
                  <span className="chip">English</span>
                </div>
                <div className="art-row">
                  <span className="grow">Voice note</span>
                  <span style={{ color: "var(--muted)" }}>→</span>
                  <b className="mono">₹620</b>
                </div>
                <div className="hint">
                  <BoltIcon size={13} /> Same channel, same ledger.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- close */}
        <section className="closing wrap">
          <span className="hero-badge" style={{ marginBottom: 20 }}>
            <i className="dot" style={{ color: "var(--accent)" }} />
            {plural(live.length, "lot")} open right now
          </span>
          <h2>Go and put a number on something.</h2>
          <p>
            Pick a name, no password. You are bidding in under twenty seconds — and every bid you
            make stays in the room.
          </p>
          <StartButton label="Start bidding" />
        </section>
      </main>

      <SiteFoot />
    </>
  );
}
