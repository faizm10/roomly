import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Roamboard home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 38 38" role="presentation">
          <path d="M7 29V9h9.4c5.7 0 9.1 2.7 9.1 7.3 0 3.2-1.8 5.6-4.8 6.7L29 29h-6.2l-7.1-5.4h-3.3V29H7Zm5.4-9.8h3.7c2.6 0 4-1 4-2.9s-1.4-2.8-4-2.8h-3.7v5.7Z" />
          <circle cx="30.5" cy="8.2" r="3.2" />
        </svg>
      </span>
      {!compact ? <span className="brand-word">Roamboard</span> : <span className="brand-word brand-word-compact">RB</span>}
    </Link>
  );
}
