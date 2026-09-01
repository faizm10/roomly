"use client";

import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTrip } from "@/app/trips/actions";
import { createTripSchema } from "@/lib/validators";

export function NewTripForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = createTripSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your trip details.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await createTrip(parsed.data);
      router.push(result.demo ? "/trips/lisbon-weekender?fresh=1" : `/trips/${result.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The trip could not be created.");
      setPending(false);
    }
  }

  return (
    <form className="new-trip-form" onSubmit={submit}>
      <label>
        <span>What are you calling it?</span>
        <input name="title" placeholder="Lisbon, loosely" required />
      </label>
      <label>
        <span>
          <MapPin size={15} /> Where are you going?
        </span>
        <input name="destination" placeholder="City or region" required />
      </label>
      <div className="date-fields">
        <label>
          <span>
            <CalendarDays size={15} /> Start
          </span>
          <input name="startDate" required type="date" />
        </label>
        <label>
          <span>Come home</span>
          <input name="endDate" required type="date" />
        </label>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button button-ink button-full" disabled={pending} type="submit">
        {pending ? "Creating trip…" : "Create trip"} <ArrowRight size={18} />
      </button>
      <p className="form-footnote">You can invite friends once the board is open.</p>
    </form>
  );
}
