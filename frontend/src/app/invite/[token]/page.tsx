import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Logo } from "@/components/logo";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await params;
  return (
    <main className="invite-page">
      <header><Logo /></header>
      <section className="invite-ticket">
        <div className="invite-stub"><span>Trip invitation</span><strong>LIS</strong><small>Sep 18—22</small></div>
        <div className="invite-main"><Users size={25} /><p className="eyebrow">Faiz invited you</p><h1>Help plan<br />Lisbon, loosely.</h1><p>Add the places you want to see and keep the whole group on one map.</p><Link className="button button-ink" href="/trips/lisbon-weekender">Join the trip <ArrowRight size={17} /></Link><small>Invites are email-bound and expire after seven days when live auth is connected.</small></div>
      </section>
    </main>
  );
}
