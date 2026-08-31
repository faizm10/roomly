import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { TripWorkspace } from "@/components/trip-workspace";
import { getTrip } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tripId: string }> }): Promise<Metadata> {
  const { tripId } = await params;
  return { title: getTrip(tripId).title };
}

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = getTrip(tripId);
  return (
    <main className="workspace-page">
      <AppHeader tripTitle={trip.title} />
      <TripWorkspace trip={trip} mapToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN} />
    </main>
  );
}
