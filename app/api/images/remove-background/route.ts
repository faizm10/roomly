import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { imageUrl?: string } | null;

  if (!body?.imageUrl) {
    return NextResponse.json({ error: "Image URL is required." }, { status: 400 });
  }

  const configuredProvider = process.env.BACKGROUND_REMOVAL_API_URL;

  if (!configuredProvider) {
    return NextResponse.json({
      cutoutUrl: body.imageUrl,
      provider: "mock",
      note: "No background-removal provider configured. Using the original/demo transparent image.",
    });
  }

  return NextResponse.json({
    cutoutUrl: body.imageUrl,
    provider: "mock",
    note: "Provider interface is ready; configure BACKGROUND_REMOVAL_API_URL to call a real service.",
  });
}
