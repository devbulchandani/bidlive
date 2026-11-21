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
  onClose,
  title = "Take a seat",
  subtitle = "A name is all it takes. Open a second window with a different name to bid against yourself.",
}: {
  onPick: (name: string) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const name = value.trim();
    if (name) onPick(name);
  };

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-label="Choose your name">
      <div className="gate-card">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Your name in the room
            </div>
            <h2>{title}</h2>
          </div>
          {onClose ? (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path
                  d="M1 1l10 10M11 1L1 11"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>

        <p style={{ marginTop: 10 }}>{subtitle}</p>

        <div className="personas">
          {PERSONAS.map((p) => (
            <button key={p.name} className="persona" type="button" onClick={() => setValue(p.name)}>
              <span className="swatch" style={{ background: colorFor(p.name.toLowerCase()) }} />
              {p.name}
              <span style={{ color: "var(--faint)", fontSize: 11 }}>{p.note}</span>
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

        <button
          className="btn btn-primary"
          style={{ width: "100%", paddingRight: 9 }}
          onClick={submit}
          disabled={!value.trim()}
        >
          {value.trim() ? (
            <>
              <span
                className="avatar"
                style={{ background: colorFor(value.toLowerCase()), width: 24, height: 24 }}
              >
                {initials(value)}
              </span>
              Enter the room
            </>
          ) : (
            "Enter the room"
          )}
        </button>

        <p
          className="hint"
          style={{ marginTop: 16, lineHeight: 1.5, display: "block" }}
        >
          Choosing <b>Meera</b> or <b>Dev</b> signs you in as an auctioneer — they own the seeded
          lots, so you get the controls.
        </p>
      </div>
    </div>
  );
}
