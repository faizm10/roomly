import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "@/components/logo";

export function AppHeader({ name = "Faiz", tripTitle }: { name?: string; tripTitle?: string }) {
  return (
    <header className="app-header">
      <Logo />
      {tripTitle ? (
        <div className="app-header-trip"><span>Trip board</span><strong>{tripTitle}</strong></div>
      ) : (
        <nav className="app-nav" aria-label="App navigation">
          <Link className="active" href="/trips">My trips</Link>
          <Link href="/trips/new">New trip</Link>
        </nav>
      )}
      <div className="app-header-actions">
        {!tripTitle && <Link href="/trips/new" className="new-trip-link"><Plus size={16} /> New trip</Link>}
        <button className="profile-chip" type="button" aria-label={`${name}'s account`}>{name.slice(0, 2).toUpperCase()}</button>
      </div>
    </header>
  );
}
