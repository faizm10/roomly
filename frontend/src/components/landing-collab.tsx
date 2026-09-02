import { categoryClass, type PlaceCategory } from "@/lib/types";

/** A still of a shared board: the same place list, with everyone's name on their own saves. */
const saves: { name: string; category: PlaceCategory; note: string; by: string }[] = [
  {
    name: "Feira da Ladra",
    category: "Shop",
    note: "Tuesday flea market. Look for old ceramics.",
    by: "Faiz",
  },
  {
    name: "Gulbenkian Garden",
    category: "See",
    note: "Slow morning, sculpture garden, then coffee nearby.",
    by: "Ana",
  },
  {
    name: "Ponto Final",
    category: "Eat",
    note: "Book sunset dinner and take the ferry back.",
    by: "Jon",
  },
];

export function CollabPreview() {
  return (
    <div className="collab-preview" aria-hidden="true">
      <div className="collab-preview-head">
        <p className="collab-avatars">
          {["F", "A", "J"].map((initial) => (
            <span key={initial}>{initial}</span>
          ))}
        </p>
        <span>3 planners</span>
      </div>
      <ul className="collab-saves">
        {saves.map((save) => (
          <li key={save.name}>
            <p className="collab-save-meta">
              <em className={`category-tag ${categoryClass(save.category)}`}>{save.category}</em>
              <strong>{save.name}</strong>
            </p>
            <q>{save.note}</q>
            <small>Added by {save.by}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
