import { NextResponse, type NextRequest } from "next/server";
import { getNeonAuth } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/trips/lisbon-weekender"]);

export async function proxy(request: NextRequest) {
  const auth = getNeonAuth();
  if (!auth) return NextResponse.next();
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();
  return auth.middleware({ loginUrl: "/sign-in" })(request);
}

export const config = {
  matcher: ["/trips", "/trips/new", "/trips/:path*", "/account", "/account/:path*"],
};
