import { NextResponse } from "next/server";
import { extractProductMetadata } from "@/lib/product-adapters";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: string } | null;

  if (!body?.url) {
    return NextResponse.json({ error: "Product URL is required." }, { status: 400 });
  }

  try {
    const product = await extractProductMetadata(body.url);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not read that product link.",
      },
      { status: 400 },
    );
  }
}
