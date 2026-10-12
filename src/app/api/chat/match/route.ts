import { NextResponse } from "next/server";
import { isEnabled } from "@/lib/release";
import { getSessionUser } from "@/lib/auth";
import { getFlow, type Answers } from "@/lib/chatbot/flow";
import { matchResults } from "@/lib/chatbot/server";
import { permissionsFor } from "@/lib/permissions";

/** Listings / investments matching the properties-flow answers. Read-only and public data only. */
export async function POST(req: Request) {
  if (!isEnabled("chatbot")) return NextResponse.json({ error: "not found" }, { status: 404 });
  const can = await permissionsFor(await getSessionUser());
  if (!can("chatbot", "view") || !can("properties", "view")) return NextResponse.json({ listings: [], investments: [] });

  let answers: Answers = {};
  try {
    const body = (await req.json()) as { answers?: unknown };
    const flow = getFlow("properties")!;
    // Only keep known choice/text keys; values are used as filters, never as raw SQL.
    const raw = (body.answers ?? {}) as Record<string, unknown>;
    for (const f of flow.steps.flatMap((s) => s.fields)) {
      const v = raw[f.key];
      if (typeof v === "string") answers[f.key] = v.slice(0, 120);
    }
  } catch {
    answers = {};
  }
  return NextResponse.json(await matchResults(answers));
}
