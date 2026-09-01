export const GOOGLE_AUTH_CHANNEL = "roamboard-google-auth";
export const GOOGLE_AUTH_MESSAGE = "roamboard:google-complete";
export const SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

export type GoogleAuthMessage = {
  type: typeof GOOGLE_AUTH_MESSAGE;
  verifier?: string | null;
};

export function tripsUrlWithVerifier(verifier?: string | null) {
  if (!verifier) return "/trips";
  const params = new URLSearchParams({ [SESSION_VERIFIER_PARAM]: verifier });
  return `/trips?${params.toString()}`;
}
