import { Bookmark, MapPin } from "lucide-react";

const pins = [
  { number: 1, className: "landing-pin pin-one", label: "Prado" },
  { number: 2, className: "landing-pin pin-two", label: "Seagull" },
  { number: 3, className: "landing-pin pin-three", label: "Feira da Ladra" },
];

export function LandingMap() {
  return (
    <div className="landing-product" aria-label="An example Lisbon Roamboard">
      <div className="landing-map">
        <div className="map-water"><span>Rio Tejo</span></div>
        <div className="map-road road-one" />
        <div className="map-road road-two" />
        <div className="map-road road-three" />
        <svg className="landing-route" viewBox="0 0 600 520" role="img" aria-label="A route connecting three saved spots">
          <path d="M126 390 C 205 330, 180 220, 293 231 S 411 286, 483 156" />
        </svg>
        {pins.map((pin) => (
          <div className={pin.className} key={pin.number}>
            <span>{String(pin.number).padStart(2, "0")}</span>
            <small>{pin.label}</small>
          </div>
        ))}
        <div className="map-label"><MapPin size={13} /> Lisbon · 03 places</div>
      </div>
      <div className="landing-list">
        <header>
          <p>Portugal · Sep 18—22</p>
          <h2>Lisbon, loosely</h2>
          <span>Three places worth crossing town for.</span>
        </header>
        <nav aria-label="Example place filters"><b>All</b><span>Eat</span><span>Drink</span><span>See</span></nav>
        {pins.map((pin, index) => (
          <article className={index === 0 ? "active" : ""} key={pin.number}>
            <i>{String(pin.number).padStart(2, "0")}</i>
            <div className="landing-place-image"><span>{pin.label.slice(0, 2).toUpperCase()}</span></div>
            <div><small>{index === 0 ? "Eat · Baixa" : index === 1 ? "Drink · Príncipe Real" : "Shop · Alfama"}</small><strong>{pin.label}</strong><p>{index === 0 ? "Late lunch, then walk toward the river." : index === 1 ? "Start slowly and order another coffee." : "Old ceramics and a long wander."}</p></div>
            <Bookmark size={16} fill={index === 0 ? "currentColor" : "none"} />
          </article>
        ))}
      </div>
    </div>
  );
}
