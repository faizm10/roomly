import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getViewer, isNeonAuthConfigured } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const viewer = await getViewer();
  if (viewer && !viewer.demo) redirect("/trips");

  return (
    <AuthShell
      eyebrow="Your boards"
      lede="Pick up a shared map, add the next place, and keep the trip in one shortlist."
      switchAsButton
      switchHref="/sign-up"
      switchLabel="Create account"
      title="Your map is waiting."
    >
      <AuthForm authEnabled={isNeonAuthConfigured()} mode="sign-in" />
    </AuthShell>
  );
}
