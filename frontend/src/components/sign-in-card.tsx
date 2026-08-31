"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignInCard({ authEnabled }: { authEnabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    if (!authEnabled) {
      router.push("/trips");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: "/trips" }),
      });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "Sign in could not start.");
      window.location.assign(body.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in could not start.");
      setBusy(false);
    }
  }

  return (
    <div className="sign-in-card">
      <p className="eyebrow">Welcome back</p>
      <h1>Your places are waiting.</h1>
      <p>Sign in to make trip boards, invite friends, and keep every spot in one place.</p>
      <button className="google-button" onClick={signIn} disabled={busy} type="button">
        <span aria-hidden="true">G</span>{busy ? "Opening Google…" : authEnabled ? "Continue with Google" : "Enter the demo"}<ArrowRight size={18} />
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!authEnabled && <p className="demo-note">Demo mode · Neon Auth connects automatically when environment keys are present.</p>}
      <small>Continue to your shared travel workspace.</small>
    </div>
  );
}
