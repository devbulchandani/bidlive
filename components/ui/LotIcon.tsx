import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/**
 * The lot icons. Drawn by hand on a 24px grid with a single 1.6 stroke so they
 * read as one family — a stock icon set would have given us three different
 * stroke weights and a camera nobody could identify.
 */
function Base({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function CameraIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M3.5 8.6h2.6l1.3-2.1h7.2l1.3 2.1h2.6A1.9 1.9 0 0 1 20.4 10v6.4a1.9 1.9 0 0 1-1.9 1.9H5.5a1.9 1.9 0 0 1-1.9-1.9V10a1.9 1.9 0 0 1 1.9-1.4Z" />
      <circle cx="12" cy="13.1" r="3.3" />
      <path d="M7.4 11.2h.01" />
    </Base>
  );
}

export function SneakerIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M3 16.4c0-1 .4-1.7 1.2-2.3l3.1-2.3 1.6 1.1c.7.5 1.5.6 2.2.2l1.9-1c.6-.3 1.3-.2 1.8.3l4.4 4c.5.5.8 1.1.8 1.8v.4H3.9A.9.9 0 0 1 3 17.7v-1.3Z" />
      <path d="M10.9 12.9l1.4 1.5M13.6 11.6l1.4 1.4" />
      <path d="M3.2 19.4h17.4" />
    </Base>
  );
}

export function VinylIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="3.1" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 3.6a8.4 8.4 0 0 1 5.9 2.5" opacity=".55" />
    </Base>
  );
}

export function WatchIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="5.6" />
      <path d="M9.6 6.6 10 3.4h4l.4 3.2M9.6 17.4 10 20.6h4l.4-3.2" />
      <path d="M12 9.4V12l1.8 1.1" />
    </Base>
  );
}

export function TagIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 12.6V5.4A1.4 1.4 0 0 1 5.4 4h7.2c.4 0 .7.1 1 .4l6 6c.6.6.6 1.5 0 2.1l-5.7 5.7c-.6.6-1.5.6-2.1 0l-6-6a1.4 1.4 0 0 1-.4-1Z" />
      <circle cx="8.6" cy="8.6" r="1.3" />
    </Base>
  );
}

export function LedgerIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5.4 4.4h10.2a2 2 0 0 1 2 2v13.2H7.1a1.7 1.7 0 0 1-1.7-1.7V4.4Z" />
      <path d="M8.4 8.2h6M8.4 11.6h6M8.4 15h3.6" />
    </Base>
  );
}

export function BoltIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M13.4 3 5.6 13.2h5l-.9 7.8 8-10.4h-5.1L13.4 3Z" />
    </Base>
  );
}

export function ShieldIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 3.2 5.2 5.9v5.3c0 4 2.8 7.4 6.8 8.6 4-1.2 6.8-4.6 6.8-8.6V5.9L12 3.2Z" />
      <path d="M9.2 11.8 11.4 14l3.6-3.7" />
    </Base>
  );
}

export function GlobeIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.7 12h16.6M12 3.6c2.3 2.4 3.4 5.3 3.4 8.4s-1.1 6-3.4 8.4c-2.3-2.4-3.4-5.3-3.4-8.4S9.7 6 12 3.6Z" />
    </Base>
  );
}

export function MuteIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M15.4 8.2a4.6 4.6 0 0 1 0 7.6M18.2 5.6a8.2 8.2 0 0 1 0 12.8" />
      <path d="M8.4 9.4H5.6v5.2h2.8l3.4 2.6V6.8L8.4 9.4Z" />
      <path d="M3.4 3.4l17.2 17.2" />
    </Base>
  );
}

export function ArrowUpRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3.4 10.6 10.6 3.4M10.6 3.4H5M10.6 3.4v5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.4 6.3 4.8 8.7l4.8-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const LOT_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  camera: CameraIcon,
  sneaker: SneakerIcon,
  vinyl: VinylIcon,
  watch: WatchIcon,
  tag: TagIcon,
};

/** Falls back to a tag so an unknown icon never renders an empty tile. */
export function LotIcon({ name, ...rest }: IconProps & { name?: string }) {
  const Icon = LOT_ICONS[name ?? ""] ?? TagIcon;
  return <Icon {...rest} />;
}
