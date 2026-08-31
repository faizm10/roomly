import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { TripCard } from "@/components/trip-card";
import { demoTrips } from "@/lib/demo-data";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Your trips" };
export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const viewer = await getViewer();
  const firstName = viewer?.name?.split(" ")[0] ?? "Traveller";
  return (
    <main className="app-page">
      <AppHeader name={firstName} />
      <section className="trips-shell">
        <div className="trips-heading">
          <div>
            <p className="eyebrow">Your trips</p>
            <h1>Where to next,<br />{firstName}?</h1>
          </div>
          <div className="trips-heading-note">
            <p>A quiet index of everywhere you are considering.</p>
            <Link className="button button-ink" href="/trips/new">New trip <Plus size={17} /></Link>
          </div>
        </div>
        <div className="trip-index-list">
          {demoTrips.map((trip, index) => <TripCard trip={trip} index={index} key={trip.id} />)}
          <Link className="new-trip-card" href="/trips/new">
            <span><Plus size={22} /></span>
            <div><p className="eyebrow">Blank trip</p><h2>Start somewhere new</h2></div>
          </Link>
        </div>
        {viewer?.demo && <p className="demo-note">Demo mode · Connect Neon and provider keys for live accounts, places, and maps.</p>}
      </section>
    </main>
  );
}
