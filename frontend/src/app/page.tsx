import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { CollabPreview } from "@/components/landing-collab";
import { LandingMap } from "@/components/landing-map";
import { LandingStages } from "@/components/landing-stages";
import { SiteHeader } from "@/components/site-header";
import { WalkingPairMark } from "@/components/travel-marks";

export default function Home() {
  return (
    <main className="landing-page">
      <SiteHeader />

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">A quieter place for travel plans</p>
          <h1>Your saved places, finally on the map.</h1>
          <p className="hero-lede">
            Roamboard gathers the places scattered across Instagram, notes, and map lists into one
            thoughtful trip you can actually use.
          </p>
          <div className="hero-actions">
            <Link className="button button-ink" href="/sign-up">
              Start a trip <ArrowUpRight size={17} />
            </Link>
            <a className="text-action" href="#stages">
              See how it works <ArrowDown size={16} />
            </a>
          </div>
          <div className="hero-note">
            <WalkingPairMark />
            <span>One shared shortlist for everyone going.</span>
          </div>
        </div>
        <div className="hero-visual">
          <LandingMap />
        </div>
      </section>

      <section className="problem-section" aria-labelledby="problem-title">
        <p className="eyebrow">Where good places go</p>
        <p className="problem-line" id="problem-title">
          A place you loved is usually three apps away. A story you screenshotted. A link someone
          dropped in the group chat. A pin you saved and never opened again.
        </p>
        <p className="problem-answer">Roamboard gives them somewhere to live.</p>
      </section>

      <section className="stages-section" id="stages">
        <header className="section-heading">
          <p className="eyebrow">Save → See → Plan</p>
          <h2>
            Keep the context.
            <br />
            Lose the clutter.
          </h2>
          <p>
            Roamboard is built for the small decisions that turn a collection of good places into a
            day worth taking.
          </p>
        </header>
        <LandingStages />
      </section>

      <section className="collab-section" id="together">
        <div className="collab-copy">
          <p className="eyebrow">Planned together</p>
          <h2>Everyone saves. Nobody loses the list.</h2>
          <p>
            Invite the people you are going with. Their finds land on the same board, with their name
            still attached to the note, so the plan stops living in four different chats.
          </p>
          <Link className="text-action" href="/trips/lisbon-weekender">
            Open the example trip <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="collab-visual">
          <CollabPreview />
        </div>
      </section>

      <section className="cta-section">
        <div>
          <p className="eyebrow">Make the map useful</p>
          <h2>
            Save less vaguely.
            <br />
            Travel more deliberately.
          </h2>
        </div>
        <Link className="button button-paper button-large" href="/sign-up">
          Plan a trip <ArrowUpRight size={18} />
        </Link>
      </section>

      <footer className="site-footer">
        <div>
          <strong>Roamboard</strong>
          <span>Good places belong together.</span>
          <span>© 2026</span>
        </div>
        <div>
          <Link href="/trips/lisbon-weekender">Example trip</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Create account</Link>
          <a href="mailto:hello@roamboard.app">Say hello</a>
        </div>
      </footer>
    </main>
  );
}
