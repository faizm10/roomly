import { NextResponse } from "next/server";
import { isWorldObjectType, clamp } from "@/lib/world";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are recognizing simple whiteboard sketches.

Return ONLY valid JSON, no markdown fences, no commentary.

Allowed object types:
house, tree, road, river, cafe, person

For each distinct sketched object, return its type and the position of its
center as percentages of the image size (x: 0 = left edge, 100 = right edge;
y: 0 = top edge, 100 = bottom edge).

Return exactly this shape:
{"objects":[{"type":"house","x":32,"y":58}]}

If nothing recognizable is drawn, return {"objects":[]}.`;

interface RecognizedObject {
  type: string;
  x: number;
  y: number;
}

export async function POST(req: Request) {
  let image: string;
  try {
    const body = (await req.json()) as { image?: string };
    if (!body.image?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }
    image = body.image;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  try {
    let raw: string | null = null;
    if (openaiKey) {
      raw = await recognizeWithOpenAI(image, openaiKey);
    } else if (geminiKey) {
      raw = await recognizeWithGemini(image, geminiKey);
    } else {
      // No vision key configured — tell the client to use local demo mode.
      return NextResponse.json({ fallback: true });
    }

    return NextResponse.json({ objects: parseObjects(raw) });
  } catch (err) {
    console.error("[recognize] vision call failed:", err);
    return NextResponse.json(
      { error: "The vision model couldn't read the sketch. Try again!" },
      { status: 502 },
    );
  }
}

async function recognizeWithOpenAI(imageDataUrl: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Recognize the objects in this whiteboard sketch." },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function recognizeWithGemini(imageDataUrl: string, apiKey: string): Promise<string> {
  const [, base64] = imageDataUrl.split(",", 2);
  const model = process.env.GEMINI_VISION_MODEL ?? "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${SYSTEM_PROMPT}\n\nRecognize the objects in this whiteboard sketch.` },
              { inline_data: { mime_type: "image/png", data: base64 } },
            ],
          },
        ],
        generationConfig: { response_mime_type: "application/json" },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseObjects(raw: string): RecognizedObject[] {
  // Models occasionally wrap JSON in fences despite instructions.
  const cleaned = raw.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return [];
  }

  const objects = (parsed as { objects?: unknown }).objects;
  if (!Array.isArray(objects)) return [];

  return objects
    .filter(
      (o): o is RecognizedObject =>
        !!o &&
        typeof o === "object" &&
        typeof (o as RecognizedObject).type === "string" &&
        isWorldObjectType((o as RecognizedObject).type) &&
        Number.isFinite((o as RecognizedObject).x) &&
        Number.isFinite((o as RecognizedObject).y),
    )
    .slice(0, 24)
    .map((o) => ({
      type: o.type,
      x: clamp(o.x, 0, 100),
      y: clamp(o.y, 0, 100),
    }));
}
