import Link from "next/link";
import { ArrowUpRight, MapPin, Users } from "lucide-react";
import { PlacePhoto } from "@/components/place-photo";
import type { Trip } from "@/lib/types";

export function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const coverPlace = trip.places[0];
  return (
    <Link className="trip-card" href={`/trips/${trip.id}`}>
      <div className="trip-cover">
        {coverPlace?.fsqPlaceId ? <PlacePhoto fsqPlaceId={coverPlace.fsqPlaceId} name={coverPlace.name} label={trip.destination} sizes="(max-width: 700px) 100vw, 180px" priority={index === 0} /> : <div className="trip-cover-fallback">{trip.destination.slice(0, 2)}</div>}
        <span className="trip-index">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="trip-card-body">
        <div>
          <p className="eyebrow">{trip.country} · {trip.dateLabel}</p>
          <h2>{trip.title}</h2>
          <p className="trip-destination">{trip.destination}</p>
        </div>
        <ArrowUpRight className="trip-arrow" size={24} />
        <div className="trip-meta">
          <span><MapPin size={14} /> {trip.places.length} places</span>
          <span><Users size={14} /> {trip.collaborators.length} {trip.collaborators.length === 1 ? "traveller" : "planning"}</span>
        </div>
      </div>
    </Link>
  );
}
