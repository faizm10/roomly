import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { SignInCard } from "@/components/sign-in-card";
import { isNeonAuthConfigured } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="sign-in-page">
      <header><Logo /></header>
      <div className="sign-in-grid">
        <section className="sign-in-art" aria-label="A numbered itinerary from Lisbon">
          <p className="eyebrow">One trip, one place</p>
          <h1>Keep the places you mean to visit.</h1>
          <div className="sign-route"><span>01</span><i /><span>02</span><i /><span>03</span></div>
        </section>
        <SignInCard authEnabled={isNeonAuthConfigured()} />
      </div>
    </main>
  );
}
