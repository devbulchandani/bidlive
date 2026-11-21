"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { client } from "@/lib/client/api";
import type { LotSummary } from "@/lib/types";
import { plural, rupee } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { Arrow, SiteFoot, SiteNav } from "@/components/site/Chrome";

export default function Landing() {
  const [lots, setLots] = useState<LotSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      client
        .lots()
        .then((res) => {
          if (!alive) return;
          setLots(res.lots);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    void load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const live = lots.filter((l) => l.status === "live");
  const hero = live[0];
  const bids = lots.reduce((n, l) => n + l.bidCount, 0);

  return (
    <>
      <SiteNav />

      <main>
        {/* ---------------------------------------------------------- hero */}
        <section className="wrap">
          <div className="hero">
            <div>
              <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="dot pulse" style={{ color: "var(--rust)" }} />
                Live auctions · {plural(live.length, "lot")} open now
              </div>

              <h1 className="hero-display">
                The auction is <em>the chat</em>.
              </h1>

              <p className="hero-lede">
                No bidding form, no second tab. The room where people ask about the lot is the same
                room where the price moves. Type a number — or tap one — and the clock, the minimum
                and the record are settled on the server.
              </p>

              <div className="hero-actions">
                <Link href="/app" className="btn btn-primary" style={{ paddingRight: 9 }}>
                  Start bidding
                  <span className="bii">
                    <Arrow />
                  </span>
                </Link>
                <a href="#how" className="btn btn-ghost">
                  How it works
                </a>
              </div>

              <div className="hero-meta">
                <div>
                  <b>{live.length}</b>
                  <span>Lots live</span>
                </div>
                <div>
                  <b>{bids}</b>
                  <span>Bids placed</span>
                </div>
                <div>
                  <b>{loaded ? "180d" : "—"}</b>
                  <span>History kept</span>
                </div>
              </div>
            </div>

            {/* a real lot, not a mockup */}
            <div className="bezel">
              <article className="live-card">
                <div className="live-card-top">
                  <div>
                    <div className="label">On the block</div>
                    <div
                      className="serif"
                      style={{ fontSize: 26, letterSpacing: "-0.02em", marginTop: 6 }}
                    >
                      {hero ? hero.title : "Waiting for the first lot"}
                    </div>
                  </div>
                  <span className="chip chip-rust">
                    <i className="dot pulse" />
                    live
                  </span>
                </div>

                <div className="live-thumb">
                  <span className="lot-no">LOT 01</span>
                  <span aria-hidden>{hero?.emoji ?? "◎"}</span>
                </div>

                <div className="price-row">
                  <div>
                    <div className="label">{hero?.bidCount ? "Current bid" : "Starting at"}</div>
                    <div className="price">{rupee(hero?.currentBid ?? 0)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="label">Closes in</div>
                    {hero ? (
                      <Countdown endsAt={hero.endsAt} className="clock" />
                    ) : (
                      <span className="clock">—</span>
                    )}
                  </div>
                </div>

                <div className="bid-strip">
                  <span className="label">Bid</span>
                  {hero ? (
                    <>
                      <Link
                        href={`/app/${hero.id}`}
                        className="bid-chip bid-chip-primary"
                        style={{ display: "inline-flex" }}
                      >
                        {rupee(hero.nextMin)}
                      </Link>
                      <Link
                        href={`/app/${hero.id}`}
                        className="bid-chip"
                        style={{ display: "inline-flex" }}
                      >
                        {rupee(hero.nextMin + hero.increment)}
                      </Link>
                    </>
                  ) : null}
                </div>

                <div className="enter-row">
                  <span className="hint">
                    {hero ? `${plural(hero.bidCount, "bid")} · ${hero.watchers} watching` : ""}
                  </span>
                  <Link href={hero ? `/app/${hero.id}` : "/app"} className="enter-link">
                    Enter the room
                    <Arrow size={12} />
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- ticker */}
        <div className="ticker" aria-hidden>
          <div className="ticker-track">
            {[0, 1].map((pass) => (
              <div key={pass} style={{ display: "flex", gap: 42 }}>
                {(lots.length ? lots : []).map((lot) => (
                  <span className="ticker-item" key={`${pass}-${lot.id}`}>
                    <i
                      className={`dot ${lot.status === "live" ? "pulse" : ""}`}
                      style={{
                        color: lot.status === "live" ? "var(--rust)" : "var(--faint)",
                      }}
                    />
                    {lot.title}
                    <b>{rupee(lot.currentBid)}</b>
                    <span style={{ color: "var(--faint)" }}>
                      {lot.status === "live" ? (
                        <Countdown endsAt={lot.endsAt} />
                      ) : (
                        lot.status
                      )}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------ how it works */}
        <section className="wrap section" id="how">
          <div className="section-head">
            <h2 className="section-title">
              Three things happen when you <em>type a number</em>.
            </h2>
            <div className="eyebrow" style={{ paddingBottom: 6 }}>
              01 — 03
            </div>
          </div>

          <div className="beat">
            <div className="beat-no">01</div>
            <div>
              <h3>You bid in the same box you were talking in.</h3>
              <p>
                <code className="mono">550</code> is a bid. “Is the light meter accurate?” is a
                question. One input, two jobs — so watching a lot and bidding on it never becomes a
                decision about which tab you are in.
              </p>
            </div>
            <div className="beat-aside">
              Chips above the input offer the next increment for a single tap. The field is still
              there for a jump bid: say ₹4,000 and mean it.
            </div>
          </div>

          <div className="beat">
            <div className="beat-no">02</div>
            <div>
              <h3>The server holds the clock, not your laptop.</h3>
              <p>
                Every bid is checked against the lot: is it still open, is it above the minimum, is
                this person allowed to bid at all. A device with the wrong time still sees the right
                countdown, because the number comes from the server with every push.
              </p>
            </div>
            <div className="beat-aside">
              A bid inside the final 30 seconds extends the lot by 30 — capped at five extensions.
              The extension is announced in the room, not applied quietly.
            </div>
          </div>

          <div className="beat">
            <div className="beat-no">03</div>
            <div>
              <h3>Everyone sees the same card flip.</h3>
              <p>
                Your bid lands as a message. The moment someone beats it, your card turns from
                leading to outbid — in place, in the history, for everyone. The person who was
                leading also gets a push, so they can come back and fight.
              </p>
            </div>
            <div className="beat-aside">
              No polling, no refresh. The room is a Nexconn group channel; the socket does the
              telling.
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- ledger */}
        <section id="ledger" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="wrap quote">
            <blockquote>
              An auction is an argument about money. <em>Arguments need a transcript.</em>
            </blockquote>
            <div>
              <p className="desc" style={{ fontSize: 15.5 }}>
                “I bid six hundred, you closed early.” Every marketplace has that conversation, and
                almost none can answer it. Here every bid is a stored message in the lot’s channel —
                ordered, timestamped, recoverable months later.
              </p>
              <p className="desc" style={{ fontSize: 15.5, marginTop: 16 }}>
                That is the whole reason the bid lives in the chat rather than in a form beside it.
                A form leaves a number. A transcript leaves the story of how the number was reached:
                who asked what, when the clock was extended, who was muted, and what the reserve did.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- bento */}
        <section className="wrap section" id="built" style={{ paddingTop: 20 }}>
          <div className="section-head">
            <h2 className="section-title">
              Built on Nexconn, <em>not a socket we wrote</em>.
            </h2>
            <a
              href="https://docs.nexconn.ai"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              Read the docs
              <span className="bii">
                <Arrow size={12} />
              </span>
            </a>
          </div>

          <div className="bento">
            <div className="bezel bento-a">
              <div className="bento-card">
                <div className="label">The ledger</div>
                <h3>Every bid is a message, and messages are kept.</h3>
                <p>
                  Group channels give us ordered delivery, offline sync and history we do not have
                  to build. Reopen a lot weeks later and the argument is still there.
                </p>
                <div className="stat">180d</div>
              </div>
            </div>

            <div className="bezel bento-b">
              <div className="bento-card">
                <div className="label">Anti-snipe</div>
                <h3>A bid at 0:29 extends the clock.</h3>
                <p>
                  Thirty seconds, five times over. Announced as a message so nobody can claim the
                  clock moved without them.
                </p>
                <div className="chips" style={{ marginTop: "auto", paddingTop: 16 }}>
                  <span className="chip">+30s</span>
                  <span className="chip">max ×5</span>
                </div>
              </div>
            </div>

            <div className="bezel bento-c">
              <div className="bento-card">
                <div className="label">Bidding</div>
                <h3>One tap, or any number.</h3>
                <p>Chips for the increment. The field for a jump bid. The same message either way.</p>
              </div>
            </div>

            <div className="bezel bento-d">
              <div className="bento-card">
                <div className="label">Moderation</div>
                <h3>Mute a shill, in public.</h3>
                <p>The auctioneer’s mute is enforced on the server and their next bid is refused.</p>
              </div>
            </div>

            <div className="bezel bento-e">
              <div className="bento-card">
                <div className="label">Reach</div>
                <h3>Translation and push come with it.</h3>
                <p>
                  The SDK brings AI translation, voice-to-text and offline push — so a lot can run
                  across languages without extra work.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- close */}
        <section className="wrap closing">
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            {plural(live.length, "lot")} open right now
          </div>
          <h2>Go and put a number on something.</h2>
          <p>
            Pick a name, no password. You are bidding in under twenty seconds — and every bid you
            make stays in the room.
          </p>
          <Link href="/app" className="btn btn-primary" style={{ paddingRight: 9 }}>
            Start bidding
            <span className="bii">
              <Arrow />
            </span>
          </Link>
        </section>
      </main>

      <SiteFoot />
    </>
  );
}
