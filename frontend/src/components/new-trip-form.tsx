"use client";

import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTripSchema } from "@/lib/validators";

export function NewTripForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = createTripSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your trip details.");
      return;
    }
    router.push("/trips/lisbon-weekender?fresh=1");
  }

  return (
    <form className="new-trip-form" onSubmit={submit}>
      <label>
        <span>What are you calling it?</span>
        <input name="title" placeholder="Lisbon, loosely" defaultValue="Lisbon, loosely" required />
      </label>
      <label>
        <span><MapPin size={15} /> Where are you going?</span>
        <input name="destination" placeholder="City or region" defaultValue="Lisbon" required />
      </label>
      <div className="date-fields">
        <label><span><CalendarDays size={15} /> Start</span><input type="date" name="startDate" defaultValue="2026-09-18" required /></label>
        <label><span>Come home</span><input type="date" name="endDate" defaultValue="2026-09-22" required /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-ink button-full" type="submit">Create trip <ArrowRight size={18} /></button>
      <p className="form-footnote">You can invite friends once the board is open.</p>
    </form>
  );
}
