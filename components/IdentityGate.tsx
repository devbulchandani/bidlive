"use client";

import { useState } from "react";
import { colorFor, initials } from "@/lib/format";

const PERSONAS = [
  { name: "Riya", note: "bidder" },
  { name: "Arjun", note: "bidder" },
  { name: "Meera", note: "auctioneer" },
  { name: "Dev", note: "auctioneer" },
];

export function IdentityGate({
  onPick,
  title = "Take a seat",
  subtitle = "Pick a name — it's how the room will know you. Open a second window with a different name to bid against yourself.",
}: {
  onPick: (name: string) => void;
  title?: string;
  subtitle?: string;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    onPick(name);
  };

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-label="Choose your name">
      <div className="gate-card">
        <h2 className="serif">{title}</h2>
        <p>{subtitle}</p>

        <div className="persona-row">
          {PERSONAS.map((p) => (
            <button
              key={p.name}
              className="persona"
              onClick={() => setValue(p.name)}
              type="button"
            >
              <span className="swatch" style={{ background: colorFor(p.name.toLowerCase()) }} />
              {p.name}
              <span style={{ color: "var(--ink-mute)", fontSize: 11 }}>{p.note}</span>
            </button>
          ))}
        </div>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your name"
          maxLength={24}
          aria-label="Your name"
        />

        <button className="btn gold" style={{ width: "100%" }} onClick={submit} disabled={!value.trim()}>
          <span className="avatar" style={{ background: colorFor(value.toLowerCase()), width: 20, height: 20, fontSize: 10 }}>
            {initials(value)}
          </span>
          Enter the room
        </button>

        <p className="note" style={{ marginTop: 16, marginBottom: 0 }}>
          Choosing <b>Meera</b> or <b>Dev</b> signs you in as an auctioneer — those are the
          sellers of the seeded lots, so you&apos;ll get the auction controls.
        </p>
      </div>
    </div>
  );
}
