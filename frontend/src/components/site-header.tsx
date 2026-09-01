import Link from "next/link";
import { Logo } from "@/components/logo";
import { ProfileAvatar } from "@/components/profile-avatar";
import { getViewer } from "@/lib/auth";

export async function SiteHeader() {
  const viewer = await getViewer();
  const signedIn = Boolean(viewer && !viewer.demo);
  const name = viewer?.name ?? "Traveller";
  const image = viewer?.image;

  return (
    <header className="site-header">
      <Logo />
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#method">How it works</a>
        <a href="#map-first">Map first</a>
      </nav>
      <div className="site-actions">
        {signedIn ? (
          <>
            <Link className="text-link" href="/trips">
              Your trips
            </Link>
            <Link aria-label={`${name}'s account`} className="profile-chip-link" href="/account">
              <ProfileAvatar image={image} name={name} />
            </Link>
          </>
        ) : (
          <>
            <Link className="text-link" href="/sign-in">
              Sign in
            </Link>
            <Link className="button button-small button-ink" href="/sign-up">
              Create account
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
