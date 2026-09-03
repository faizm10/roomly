"use client";

import { Plane, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Flight } from "@/lib/types";

export type FlightDraft = Omit<Flight, "id">;

export function FlightPlanDialog({
  dates,
  flight,
  initialDate,
  onClose,
  onDelete,
  onSave,
}: {
  dates: string[];
  flight?: Flight | null;
  initialDate: string;
  onClose: () => void;
  onDelete?: (flightId: string) => void;
  onSave: (flight: FlightDraft) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const departureAirport = String(form.get("departureAirport") ?? "").trim().toUpperCase();
    const arrivalAirport = String(form.get("arrivalAirport") ?? "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(departureAirport) || !/^[A-Z]{3}$/.test(arrivalAirport)) {
      setError("Use three-letter airport codes, such as YYZ or LIS.");
      return;
    }
    onSave({
      plannedDate: String(form.get("plannedDate") ?? ""),
      airline: String(form.get("airline") ?? "").trim(),
      flightNumber: String(form.get("flightNumber") ?? "").trim(),
      departureAirport,
      arrivalAirport,
      departureTime: String(form.get("departureTime") ?? ""),
      arrivalTime: String(form.get("arrivalTime") ?? ""),
    });
    onClose();
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="place-dialog flight-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="flight-plan-title" tabIndex={-1}>
        <header>
          <span className="dialog-step">Flight plan</span>
          <button className="icon-button" onClick={onClose} aria-label="Close" type="button"><X size={20} /></button>
        </header>
        <p className="eyebrow"><Plane size={13} /> Travel day</p>
        <h2 id="flight-plan-title">{flight ? "Edit flight" : "Add a flight"}</h2>
        <form className="flight-form" onSubmit={submit}>
          <label className="field-label">
            <span>Date</span>
            <select defaultValue={flight?.plannedDate ?? initialDate} name="plannedDate" required>
              {dates.map((date) => <option key={date} value={date}>{new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}</option>)}
            </select>
          </label>
          <div className="flight-form-grid">
            <label className="field-label"><span>Airline <small>Optional</small></span><input defaultValue={flight?.airline ?? ""} name="airline" placeholder="Air Canada" /></label>
            <label className="field-label"><span>Flight no. <small>Optional</small></span><input defaultValue={flight?.flightNumber ?? ""} name="flightNumber" placeholder="AC 836" /></label>
          </div>
          <div className="flight-form-grid flight-route-fields">
            <label className="field-label"><span>From</span><input defaultValue={flight?.departureAirport ?? ""} maxLength={3} name="departureAirport" placeholder="YYZ" required /></label>
            <label className="field-label"><span>To</span><input defaultValue={flight?.arrivalAirport ?? ""} maxLength={3} name="arrivalAirport" placeholder="LIS" required /></label>
          </div>
          <div className="flight-form-grid">
            <label className="field-label"><span>Departs</span><input defaultValue={flight?.departureTime ?? ""} name="departureTime" required type="time" /></label>
            <label className="field-label"><span>Arrives</span><input defaultValue={flight?.arrivalTime ?? ""} name="arrivalTime" required type="time" /></label>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="flight-dialog-actions">
            {flight && onDelete ? <button className="button button-ghost" onClick={() => { onDelete(flight.id); onClose(); }} type="button">Remove flight</button> : <span />}
            <button className="button button-ink" type="submit">{flight ? "Save flight" : "Add flight"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
