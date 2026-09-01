import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Logo />
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#method">How it works</a>
        <a href="#map-first">Map first</a>
      </nav>
      <div className="site-actions">
        <Link className="text-link" href="/sign-in">
          Sign in
        </Link>
        <Link className="button button-small button-ink" href="/sign-up">
          Create account
        </Link>
      </div>
    </header>
  );
}
