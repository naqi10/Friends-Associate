import { NextResponse } from "next/server";
import { isEnabled } from "@/lib/release";
import { getSessionUser } from "@/lib/auth";
import { runHelpChat } from "@/lib/chat";
import { detectIntent, detectLanguage } from "@/lib/chatbot/detect";
import { UI } from "@/lib/chatbot/flow";
import { permissionsFor } from "@/lib/permissions";

const MAX_MESSAGE_LENGTH = 500;
const BUYER_TOPICS = /payment|receipt|raseed|rasid|رسید|owe|outstanding|next|document|progress|qist|qisṭ|raqam|kaghaz|ادائیگی|قسط|کاغذات|دستاویز/i;
const PUBLIC_TOPICS = /project|available|contact|sales|login/i;

/**
 * Typed messages. Private answers only for the logged-in buyer's own records; otherwise the message is
 * matched to a guided flow (returned as `action`) or answered with a fallback in the visitor's language.
 */
export async function POST(req: Request) {
  if (!isEnabled("chatbot")) return NextResponse.json({ error: "not found" }, { status: 404 });
  let message = "";
  try {
    const body = (await req.json()) as { message?: unknown };
    message = typeof body.message === "string" ? body.message.slice(0, MAX_MESSAGE_LENGTH) : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const user = await getSessionUser();
  const can = await permissionsFor(user);
  if (!can("chatbot", "view")) {
    return NextResponse.json({ reply: "The help assistant is not available right now. Please use the Contact page." });
  }

  const lang = detectLanguage(message);
  if (user?.role === "buyer" && BUYER_TOPICS.test(message)) {
    return NextResponse.json({ reply: await runHelpChat(message, user, can), lang });
  }
  const intent = detectIntent(message);
  if (intent) return NextResponse.json({ reply: UI.detected[lang], lang, action: intent });
  if (PUBLIC_TOPICS.test(message)) return NextResponse.json({ reply: await runHelpChat(message, user, can), lang });
  return NextResponse.json({ reply: UI.fallback[lang], lang });
}
