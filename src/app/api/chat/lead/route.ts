import { NextResponse } from "next/server";
import { isEnabled } from "@/lib/release";
import { getSessionUser } from "@/lib/auth";
import { getFlow, sanitizeAnswers, type Lang } from "@/lib/chatbot/flow";
import { saveChatLead } from "@/lib/chatbot/server";
import { permissionsFor } from "@/lib/permissions";
import { allowPublicSubmission, clientIp, isSameOrigin } from "@/lib/public-guard";

/** Saves a completed guided conversation as a lead. Answers are re-validated against the flow definition. */
export async function POST(req: Request) {
  if (!isEnabled("chatbot")) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const can = await permissionsFor(await getSessionUser());
  if (!can("chatbot", "view")) return NextResponse.json({ error: "unavailable" }, { status: 403 });

  let body: { flow?: unknown; answers?: unknown; lang?: unknown; website?: unknown; shown?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  // Honeypot: pretend success so bots learn nothing.
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true });

  const flow = getFlow(String(body.flow));
  const answers = flow ? sanitizeAnswers(flow, body.answers) : null;
  if (!flow || !answers) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const lang: Lang = body.lang === "ur" || body.lang === "roman" ? body.lang : "en";
  const shown = Array.isArray(body.shown) ? body.shown.filter((x): x is string => typeof x === "string").slice(0, 10) : [];

  if (!(await allowPublicSubmission(clientIp(req.headers)))) return NextResponse.json({ error: "rate-limit" }, { status: 429 });
  await saveChatLead(flow, answers, lang, shown);
  return NextResponse.json({ ok: true });
}
