"use client";

import { CalendarPlus, Check, MapPin, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { addAgendaItem, removeAgendaItem, saveAgendaDayNote, updateAgendaBrief, updateAgendaItem } from "@/app/trips/actions";
import type { AgendaDayNote, AgendaItem, Place, TripAgenda } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";
type AgendaItemDraft = Pick<AgendaItem, "plannedDate" | "startTime" | "placeId" | "title">;

function dayLabel(iso: string) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return {
    weekday: date.toLocaleDateString("en", { weekday: "long", timeZone: "UTC" }),
    date: date.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }),
  };
}

function displayTime(value?: string | null) {
  if (!value) return "Any time";
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const clockHour = hour % 12 || 12;
  return `${clockHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function sortAgendaItems(items: AgendaItem[]) {
  return [...items].sort((left, right) => {
    if (left.startTime && right.startTime && left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
    if (left.startTime && !right.startTime) return -1;
    if (!left.startTime && right.startTime) return 1;
    return left.sortOrder - right.sortOrder;
  });
}

export function AgendaPanel({
  agenda,
  dates,
  places,
  persistable,
  tripId,
  onEditTrip,
  onFocusDate,
  onSaveState,
}: {
  agenda: TripAgenda;
  dates: string[];
  places: Place[];
  persistable: boolean;
  tripId: string;
  onEditTrip: () => void;
  onFocusDate: (date: string | null) => void;
  onSaveState: (state: SaveState) => void;
}) {
  const [brief, setBrief] = useState(agenda.brief);
  const [dayNotes, setDayNotes] = useState<Record<string, AgendaDayNote>>(() => Object.fromEntries(agenda.dayNotes.map((note) => [note.plannedDate, note])));
  const [items, setItems] = useState(agenda.items);
  const briefTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const localItemCounter = useRef(0);
  const itemsByDate = useMemo(() => {
    const groups = new Map<string, AgendaItem[]>();
    for (const item of items) {
      const key = item.plannedDate ?? "";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return new Map([...groups.entries()].map(([key, group]) => [key, sortAgendaItems(group)]));
  }, [items]);

  useEffect(() => () => {
    if (briefTimer.current) clearTimeout(briefTimer.current);
    noteTimers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  async function save<T>(work: () => Promise<T>): Promise<T | undefined> {
    if (!persistable) return undefined;
    onSaveState("saving");
    try {
      const result = await work();
      onSaveState("saved");
      return result;
    } catch {
      onSaveState("error");
      return undefined;
    }
  }

  function commitBrief(value: string) {
    if (briefTimer.current) clearTimeout(briefTimer.current);
    void save(() => updateAgendaBrief({ tripId, brief: value }));
  }

  function changeBrief(value: string) {
    setBrief(value);
    if (!persistable) return;
    if (briefTimer.current) clearTimeout(briefTimer.current);
    briefTimer.current = setTimeout(() => commitBrief(value), 650);
  }

  function changeDayNote(date: string, note: string) {
    setDayNotes((current) => ({
      ...current,
      [date]: { id: current[date]?.id ?? `local-agenda-note-${date}`, plannedDate: date, note },
    }));
    if (!persistable) return;
    const timer = noteTimers.current.get(date);
    if (timer) clearTimeout(timer);
    noteTimers.current.set(date, setTimeout(() => {
      noteTimers.current.delete(date);
      void save(() => saveAgendaDayNote({ tripId, plannedDate: date, note }));
    }, 650));
  }

  function commitDayNote(date: string, note: string) {
    const timer = noteTimers.current.get(date);
    if (timer) clearTimeout(timer);
    noteTimers.current.delete(date);
    void save(() => saveAgendaDayNote({ tripId, plannedDate: date, note }));
  }

  function addItem(draft: AgendaItemDraft) {
    localItemCounter.current += 1;
    const key = draft.plannedDate ?? "";
    const next: AgendaItem = {
      id: `local-agenda-item-${localItemCounter.current}`,
      plannedDate: draft.plannedDate || null,
      startTime: draft.startTime || null,
      placeId: draft.placeId || null,
      title: draft.title.trim(),
      completed: false,
      sortOrder: (itemsByDate.get(key) ?? []).length,
    };
    setItems((current) => [...current, next]);
    if (!persistable) return;
    void save(() => addAgendaItem({ ...draft, tripId })).then((result) => {
      if (!result || typeof result !== "object" || !("id" in result) || !result.id) return;
      const saved = result as { id: string; sortOrder?: number };
      setItems((current) => current.map((item) => item.id === next.id ? { ...item, id: saved.id, sortOrder: saved.sortOrder ?? item.sortOrder } : item));
    });
  }

  function changeItem(id: string, patch: Partial<AgendaItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function commitItem(item: AgendaItem) {
    if (!persistable || item.id.startsWith("local-")) return;
    void save(() => updateAgendaItem({
      tripId,
      itemId: item.id,
      plannedDate: item.plannedDate ?? "",
      startTime: item.startTime ?? "",
      placeId: item.placeId ?? "",
      title: item.title,
      completed: item.completed,
    }));
  }

  function removeItem(item: AgendaItem) {
    const previous = items;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (!persistable || item.id.startsWith("local-")) return;
    void save(() => removeAgendaItem({ tripId, itemId: item.id })).then((result) => {
      if (!result) setItems(previous);
    });
  }

  return (
    <section className="agenda-panel" aria-label="Trip agenda">
      <header className="agenda-intro">
        <div>
          <p className="eyebrow">Shared travel page</p>
          <h2>Agenda</h2>
        </div>
        <div className="agenda-intro-actions">
          <span>{items.filter((item) => !item.completed).length} open</span>
          <button onClick={() => onFocusDate(null)} type="button">All places</button>
        </div>
      </header>

      <section className="agenda-brief">
        <label htmlFor="agenda-brief">Trip brief</label>
        <textarea
          id="agenda-brief"
          maxLength={5000}
          onBlur={() => commitBrief(brief)}
          onChange={(event) => changeBrief(event.target.value)}
          placeholder="Keep the details everyone should know: bookings, neighborhoods, packing notes, or the feeling you want the trip to have."
          value={brief}
        />
        <small>Shared with every trip planner · saves automatically</small>
      </section>

      {!dates.length ? (
        <section className="agenda-empty-dates">
          <CalendarPlus size={19} />
          <div><strong>Add dates to shape the trip.</strong><p>Until then, keep flexible tasks in Unscheduled.</p></div>
          <button onClick={onEditTrip} type="button">Add dates</button>
        </section>
      ) : null}

      {dates.map((date) => (
        <AgendaSection
          date={date}
          dayNote={dayNotes[date]?.note ?? ""}
          items={itemsByDate.get(date) ?? []}
          key={date}
          onAdd={addItem}
          onChangeDayNote={(note) => changeDayNote(date, note)}
          onChangeItem={changeItem}
          onCommitDayNote={(note) => commitDayNote(date, note)}
          onCommitItem={commitItem}
          onDeleteItem={removeItem}
          onFocusDate={() => onFocusDate(date)}
          places={places}
        />
      ))}
      <AgendaSection
        date={null}
        items={itemsByDate.get("") ?? []}
        onAdd={addItem}
        onChangeItem={changeItem}
        onCommitItem={commitItem}
        onDeleteItem={removeItem}
        places={places}
      />
    </section>
  );
}

function AgendaSection({
  date,
  dayNote,
  items,
  onAdd,
  onChangeDayNote,
  onChangeItem,
  onCommitDayNote,
  onCommitItem,
  onDeleteItem,
  onFocusDate,
  places,
}: {
  date: string | null;
  dayNote?: string;
  items: AgendaItem[];
  onAdd: (draft: AgendaItemDraft) => void;
  onChangeDayNote?: (note: string) => void;
  onChangeItem: (id: string, patch: Partial<AgendaItem>) => void;
  onCommitDayNote?: (note: string) => void;
  onCommitItem: (item: AgendaItem) => void;
  onDeleteItem: (item: AgendaItem) => void;
  onFocusDate?: () => void;
  places: Place[];
}) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [placeId, setPlaceId] = useState("");
  const openItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);
  const label = date ? dayLabel(date) : null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onAdd({ plannedDate: date ?? "", startTime, placeId, title });
    setTitle("");
    setStartTime("");
    setPlaceId("");
  }

  return (
    <section className={`agenda-day${date ? "" : " unscheduled"}`}>
      <header className="agenda-day-header">
        <div>
          <span>{label?.weekday ?? "Unscheduled"}</span>
          <h3>{label?.date ?? "Keep it flexible"}</h3>
        </div>
        {onFocusDate ? <button onClick={onFocusDate} type="button"><MapPin size={14} /> Map places</button> : null}
      </header>
      {date ? (
        <textarea
          className="agenda-day-note"
          maxLength={2000}
          onBlur={(event) => onCommitDayNote?.(event.target.value)}
          onChange={(event) => onChangeDayNote?.(event.target.value)}
          placeholder="A note for this day—pace, reservations, or a small reminder."
          value={dayNote}
        />
      ) : null}
      <div className="agenda-items" aria-label={date ? `${label?.weekday} agenda items` : "Unscheduled agenda items"}>
        {openItems.map((item) => <AgendaItemRow item={item} key={item.id} onChange={onChangeItem} onCommit={onCommitItem} onDelete={onDeleteItem} places={places} />)}
        {!openItems.length ? <p className="agenda-empty">Nothing here yet. Add the next useful thing.</p> : null}
      </div>
      {completedItems.length ? (
        <div className="agenda-completed">
          <span><Check size={13} /> Completed</span>
          {completedItems.map((item) => <AgendaItemRow item={item} key={item.id} onChange={onChangeItem} onCommit={onCommitItem} onDelete={onDeleteItem} places={places} />)}
        </div>
      ) : null}
      <form className="agenda-add" onSubmit={submit}>
        <label className="sr-only" htmlFor={`agenda-item-${date ?? "unscheduled"}`}>Add an agenda item</label>
        <input aria-label="Start time" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
        <input id={`agenda-item-${date ?? "unscheduled"}`} maxLength={160} onChange={(event) => setTitle(event.target.value)} placeholder={date ? "Add something to do" : "Add a flexible task"} value={title} />
        <select aria-label="Optional saved place" onChange={(event) => setPlaceId(event.target.value)} value={placeId}>
          <option value="">No place linked</option>
          {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select>
        <button aria-label="Add agenda item" type="submit"><Plus size={16} /></button>
      </form>
    </section>
  );
}

function AgendaItemRow({
  item,
  onChange,
  onCommit,
  onDelete,
  places,
}: {
  item: AgendaItem;
  onChange: (id: string, patch: Partial<AgendaItem>) => void;
  onCommit: (item: AgendaItem) => void;
  onDelete: (item: AgendaItem) => void;
  places: Place[];
}) {
  function patch(patchValue: Partial<AgendaItem>, save = false) {
    const next = { ...item, ...patchValue };
    onChange(item.id, patchValue);
    if (save) onCommit(next);
  }

  return (
    <div className={`agenda-item${item.completed ? " complete" : ""}`}>
      <label className="agenda-check">
        <input aria-label={`Mark ${item.title} ${item.completed ? "incomplete" : "complete"}`} checked={item.completed} onChange={(event) => patch({ completed: event.target.checked }, true)} type="checkbox" />
        <span><Check size={12} /></span>
      </label>
      <span className="agenda-time" title={displayTime(item.startTime)}>{displayTime(item.startTime)}</span>
      <input aria-label="Agenda item title" maxLength={160} onBlur={() => onCommit(item)} onChange={(event) => patch({ title: event.target.value })} value={item.title} />
      <select aria-label="Linked saved place" onChange={(event) => patch({ placeId: event.target.value || null }, true)} value={item.placeId ?? ""}>
        <option value="">No place</option>
        {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
      </select>
      <input aria-label="Start time" onChange={(event) => patch({ startTime: event.target.value || null }, true)} type="time" value={item.startTime ?? ""} />
      <button aria-label={`Remove ${item.title}`} onClick={() => onDelete(item)} type="button"><Trash2 size={15} /></button>
    </div>
  );
}
