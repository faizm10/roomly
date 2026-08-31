import Link from "next/link";
import { ArrowDown, ArrowUpRight, Bookmark, Map, Route, Users } from "lucide-react";
import { LandingMap } from "@/components/landing-map";
import { SiteHeader } from "@/components/site-header";

const method = [
  {
    icon: Bookmark,
    title: "Save the place, not the post",
    copy: "Turn a link, recommendation, or passing thought into a place you can find again.",
  },
  {
    icon: Map,
    title: "See the trip take shape",
    copy: "Every save lands on one shared map, with the note that made it worth keeping.",
  },
  {
    icon: Route,
    title: "Leave with a route",
    copy: "Connect the shortlist, preview the journey, and hand it to your navigation app.",
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      <SiteHeader />
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">A quieter place for travel plans</p>
          <h1>Your saved places, finally on the map.</h1>
          <p className="hero-lede">
            Roamboard gathers the places scattered across Instagram, notes, and map lists into one thoughtful trip you can actually use.
          </p>
          <div className="hero-actions">
            <Link className="button button-ink" href="/trips">
              Start a trip <ArrowUpRight size={17} />
            </Link>
            <a className="text-action" href="#method">
              See how it works <ArrowDown size={16} />
            </a>
          </div>
          <div className="hero-note"><Users size={16} /><span>One shared shortlist for everyone going.</span></div>
        </div>
        <div className="hero-visual"><LandingMap /></div>
      </section>

      <section className="method-section" id="method">
        <header className="section-heading">
          <p className="eyebrow">From saved to scheduled</p>
          <h2>Keep the context.<br />Lose the clutter.</h2>
          <p>Roamboard is built for the small decisions that turn a collection of good places into a day worth taking.</p>
        </header>
        <div className="method-list">
          {method.map(({ icon: Icon, title, copy }, index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon size={21} strokeWidth={1.6} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="map-first-section" id="map-first">
        <div className="map-first-copy">
          <p className="eyebrow">The map is the plan</p>
          <h2>Know what is close before the day gets busy.</h2>
          <p>Filter by mood, follow the numbered itinerary rail, and keep every recommendation connected to the place it belongs.</p>
          <Link className="text-action" href="/trips/lisbon-weekender">Explore the example trip <ArrowUpRight size={16} /></Link>
        </div>
        <div className="map-first-index" aria-label="Example itinerary">
          <div><span>01</span><strong>Late lunch</strong><small>Baixa</small></div>
          <div><span>02</span><strong>Garden hour</strong><small>Avenidas Novas</small></div>
          <div><span>03</span><strong>Walk to coffee</strong><small>Príncipe Real</small></div>
        </div>
      </section>

      <section className="cta-section">
        <div><p className="eyebrow">Make the map useful</p><h2>Save less vaguely.<br />Travel more deliberately.</h2></div>
        <Link className="button button-paper button-large" href="/trips/new">Plan a trip <ArrowUpRight size={18} /></Link>
      </section>

      <footer className="site-footer">
        <div><strong>Roamboard</strong><span>Good places belong together.</span></div>
        <div><Link href="/sign-in">Sign in</Link><a href="mailto:hello@roamboard.app">Say hello</a></div>
        <span>© 2026 Roamboard</span>
      </footer>
    </main>
  );
}
