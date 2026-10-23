"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HomeImage } from "@/components/home/HomeImage";
import { BRAND } from "@/lib/brand";
import {
  FLOWS,
  UI,
  answerLabel,
  getFlow,
  isVisible,
  stepProblem,
  type Answers,
  type Field,
  type FlowKey,
  type Lang,
} from "@/lib/chatbot/flow";
import { formatPkr } from "@/lib/format";
import { propertyPath } from "@/lib/property-slug";

type View = "menu" | "flow" | "review" | "done";
type Bubble = { role: "user" | "bot"; text: string; link?: { href: string; label: string } };
type Listing = { id: string; slug: string | null; image: string; projectName: string | null; title: string; price: number; listingType: string; size: string; locality: string; city: string };
type Results = { listings: Listing[]; investments: { slug: string; title: string; minimum: number; duration: string }[] };
type Tx = (v: Record<Lang, string>) => string;

const LANG_KEY = "fa-chat-lang";
const LANGS: { key: Lang; label: string; short: string }[] = [
  { key: "en", label: "English", short: "EN" },
  { key: "ur", label: "اردو", short: "اردو" },
  { key: "roman", label: "Roman Urdu", short: "Roman" },
];
/** The phone with a non-breaking hyphen, so "0312-6711828" never splits across two lines. */
const PHONE = BRAND.phone.replace(/-/g, "‑");
const WHATSAPP = `https://wa.me/${BRAND.phoneIntl.replace(/\D/g, "")}`;
const TEL = `tel:${BRAND.phoneIntl.replace(/\s/g, "")}`;
const t = (en: string, ur: string, roman: string) => ({ en, ur, roman });

/** Interface text for the new layout (flow questions and answers live in lib/chatbot/flow.ts). */
const COPY = {
  name: t("Friends Assistant", "فرینڈز اسسٹنٹ", "Friends Assistant"),
  online: t("Online · replies in seconds", "آن لائن · فوراً جواب", "Online · foran jawab"),
  hello: t("Assalam-o-Alaikum!", "السلام علیکم!", "Assalam-o-Alaikum!"),
  helloLine: t(
    "I'm the Friends Associates assistant. What can I help you with today?",
    "میں فرینڈز ایسوسی ایٹس کا اسسٹنٹ ہوں۔ آج میں آپ کی کیا مدد کر سکتا ہوں؟",
    "Main Friends Associates ka assistant hoon. Aaj main aap ki kya madad kar sakta hoon?",
  ),
  today: t("Today", "آج", "Aaj"),
  often: t("People often ask", "اکثر پوچھے جانے والے سوال", "Log aksar poochte hain"),
  person: t("Prefer to talk to a person?", "کسی انسان سے بات کرنا چاہتے ہیں؟", "Kisi insaan se baat karni hai?"),
  ask: t("Ask anything…", "کچھ بھی پوچھیں…", "Kuch bhi poochein…"),
  describe: t("Or describe your project…", "یا اپنے پراجیکٹ کے بارے میں لکھیں…", "Ya apne project ke baare mein likhein…"),
  note: t(
    "Assistant · answers from Friends Associates' approved info",
    "اسسٹنٹ · صرف فرینڈز ایسوسی ایٹس کی منظور شدہ معلومات",
    "Assistant · sirf Friends Associates ki approved maloomat",
  ),
  talkInstead: t("Talk to us instead", "اس کے بجائے ہم سے بات کریں", "Is ke bajaye hum se baat karein"),
  details: t("Details", "تفصیل", "Details"),
  bookVisit: t("Book visit", "وزٹ بک کریں", "Visit book"),
  sale: t("Sale", "فروخت", "Sale"),
  rent: t("Rent", "کرایہ", "Rent"),
  restart: t("Start over", "دوبارہ شروع کریں", "Dobara shuru"),
  close: t("Close", "بند کریں", "Band karein"),
  back: t("Back", "پیچھے", "Peechay"),
  listen: t("Speak your question", "اپنا سوال بولیں", "Apna sawal bolein"),
  found: t("options found", "آپشن ملے", "options mile"),
  review: t("Review", "جائزہ لیں", "Review karein"),
  reviewTitle: t("Review your inquiry", "اپنی انکوائری چیک کریں", "Apni inquiry check karein"),
  reviewHint: t(
    "Please check your details. Tap Edit to change anything before sending.",
    "بھیجنے سے پہلے اپنی تفصیلات چیک کریں۔ کچھ بدلنا ہو تو ترمیم دبائیں۔",
    "Bhejne se pehle apni details check karein. Kuch badalna ho to Edit dabayein.",
  ),
  edit: t("Edit", "ترمیم", "Edit"),
  yourDetails: t("Your details", "آپ کی تفصیلات", "Aap ki details"),
};

const SUBTITLES: Record<FlowKey, Record<Lang, string>> = {
  architecture: t("Plans, 3D elevation, approvals", "نقشے، تھری ڈی، منظوری", "Naqshay, 3D, approvals"),
  construction: t("Build, renovate, grey structure", "تعمیر، رینوویشن، گرے اسٹرکچر", "Tameer, renovation, grey structure"),
  properties: t("Buy, rent or sell", "خریدیں، کرایہ، فروخت", "Khareedein, kiraya, farokht"),
};
const TILE: Record<FlowKey, string> = {
  architecture: "bg-[#f3ebdf] text-[#8a6a2f]",
  construction: "bg-[#e3efee] text-[#1f6f6a]",
  properties: "bg-[#ece8f5] text-[#5b3f91]",
};

type Quick = { key: string; label: Record<Lang, string>; reply?: Record<Lang, string>; link?: { href: string; label: Record<Lang, string> } };
const QUICK: Quick[] = [
  { key: "available", label: t("Available properties", "دستیاب پراپرٹیز", "Available properties") },
  {
    key: "payment",
    label: t("Payment plans", "ادائیگی کے پلان", "Payment plans"),
    reply: t(
      "Payment plans depend on the project and unit. Each project page shows its plan, and our sales team can share the exact schedule.",
      "ادائیگی کا پلان پراجیکٹ اور یونٹ کے مطابق ہوتا ہے۔ ہر پراجیکٹ کے صفحے پر پلان موجود ہے، اور ہماری سیلز ٹیم مکمل شیڈول بتا سکتی ہے۔",
      "Payment plan project aur unit ke hisaab se hota hai. Har project ke page par plan mojood hai, aur hamari sales team poora schedule bata sakti hai.",
    ),
    link: { href: "/projects", label: t("See projects", "پراجیکٹس دیکھیں", "Projects dekhein") },
  },
  {
    key: "progress",
    label: t("Project progress", "پراجیکٹ کی پیش رفت", "Project progress"),
    reply: t(
      "Every project's construction progress is published online, stage by stage.",
      "ہر پراجیکٹ کی تعمیر کی پیش رفت مرحلہ وار آن لائن دستیاب ہے۔",
      "Har project ki tameer ki progress marhala-war online mojood hai.",
    ),
    link: { href: "/progress", label: t("Open progress", "پیش رفت دیکھیں", "Progress dekhein") },
  },
  {
    key: "office",
    label: t("Office location", "دفتر کا پتہ", "Office location"),
    reply: t(
      `Our head office is in ${BRAND.city}, with teams in Lahore and Karachi. Call ${PHONE} before visiting.`,
      `ہمارا ہیڈ آفس ${"رحیم یار خان"} میں ہے، اور لاہور اور کراچی میں ٹیمیں ہیں۔ آنے سے پہلے ${PHONE} پر کال کریں۔`,
      `Hamara head office ${BRAND.city} mein hai, Lahore aur Karachi mein bhi teams hain. Aane se pehle ${PHONE} par call karein.`,
    ),
    link: { href: "/contact", label: t("Addresses & map", "پتے اور نقشہ", "Pate aur naqsha") },
  },
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};
function speechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [view, setView] = useState<View>("menu");
  const [flowKey, setFlowKey] = useState<FlowKey | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [log, setLog] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [listening, setListening] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const flow = flowKey ? getFlow(flowKey) : undefined;
  const step = flow?.steps[stepIdx];
  const rtl = lang === "ur";
  const tx: Tx = (v) => v[lang];

  /** On open, restore the visitor's saved language. Storage may be unavailable (private mode). */
  function toggleOpen() {
    if (!open) {
      try {
        const saved = localStorage.getItem(LANG_KEY) as Lang | null;
        if (saved && LANGS.some((l) => l.key === saved)) setLang(saved);
      } catch {
        /* ignore */
      }
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [log, view, stepIdx, results]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function chooseLang(l: Lang) {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }

  const match = useMutation({
    mutationFn: (a: Answers) => postJson<Results>("/api/chat/match", { answers: a }),
    onSuccess: setResults,
    onError: () => setResults({ listings: [], investments: [] }),
  });

  const lead = useMutation({
    mutationFn: () =>
      postJson<{ ok: boolean }>("/api/chat/lead", {
        flow: flowKey,
        answers,
        lang,
        website: honeypot.current?.value ?? "",
        shown: results?.listings.map((l) => l.id) ?? [],
      }),
    onSuccess: () => setView("done"),
    onError: () => setProblem(tx(UI.failed)),
  });

  const ask = useMutation({
    mutationFn: (message: string) =>
      postJson<{ reply: string; lang?: Lang; action?: { flow: FlowKey; prefill: Answers } }>("/api/chat", { message }),
    onSuccess: (res) => {
      // Reply in the language the visitor typed in, as the brief requires.
      if (res.lang && res.lang !== lang) chooseLang(res.lang);
      setLog((l) => [...l, { role: "bot", text: res.reply }]);
      if (res.action) startFlow(res.action.flow, res.action.prefill, false);
    },
    onError: () => setLog((l) => [...l, { role: "bot", text: tx(UI.failed) }]),
  });

  function startFlow(key: FlowKey, prefill: Answers = {}, echo = true) {
    if (echo) setLog((l) => [...l, { role: "user", text: tx(getFlow(key)!.label) }]);
    setFlowKey(key);
    setAnswers(prefill);
    setStepIdx(0);
    setProblem(null);
    setResults(null);
    setView("flow");
  }

  function reset() {
    setFlowKey(null);
    setAnswers({});
    setStepIdx(0);
    setProblem(null);
    setResults(null);
    setLog([]);
    setView("menu");
  }

  function quick(q: Quick) {
    if (q.key === "available") {
      startFlow("properties", { intent: "buy" }, false);
      setLog((l) => [...l, { role: "user", text: tx(q.label) }]);
      return;
    }
    setLog((l) => [
      ...l,
      { role: "user", text: tx(q.label) },
      { role: "bot", text: tx(q.reply!), link: q.link ? { href: q.link.href, label: tx(q.link.label) } : undefined },
    ]);
  }

  function setAnswer(field: Field, value: string) {
    setProblem(null);
    setAnswers((prev) => {
      if (field.kind === "choice" && field.multiple) {
        const cur = Array.isArray(prev[field.key]) ? (prev[field.key] as string[]) : [];
        // "None yet" is exclusive with the other document options.
        let next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
        if (value === "none" && next.includes("none")) next = ["none"];
        else next = next.filter((v) => v !== "none" || value === "none");
        return { ...prev, [field.key]: next };
      }
      return { ...prev, [field.key]: value };
    });
  }

  function next() {
    if (!flow || !step) return;
    const p = stepProblem(step, answers);
    if (p) {
      setProblem(tx(p === "phone" ? UI.phoneInvalid : UI.required));
      return;
    }
    if (stepIdx === flow.steps.length - 1) {
      // Last card: show everything for a final check before anything is sent.
      setView("review");
      return;
    }
    const nextStep = flow.steps[stepIdx + 1];
    if (nextStep.results) {
      setResults(null);
      match.mutate(answers);
    }
    setStepIdx(stepIdx + 1);
  }

  function back() {
    setProblem(null);
    if (view === "review") setView("flow");
    else if (view !== "flow" || stepIdx === 0) reset();
    else setStepIdx(stepIdx - 1);
  }

  function send() {
    const text = input.trim().slice(0, 500);
    if (!text || ask.isPending) return;
    setInput("");
    setLog((l) => [...l, { role: "user", text }]);
    ask.mutate(text);
  }

  function listen() {
    const Ctor = speechCtor();
    if (!Ctor || listening) return;
    const rec = new Ctor();
    rec.lang = lang === "ur" ? "ur-PK" : "en-PK";
    rec.interimResults = false;
    rec.onresult = (e) => {
      setInput((prev) => `${prev ? `${prev} ` : ""}${e.results[0][0].transcript}`.slice(0, 500));
      inputRef.current?.focus();
    };
    rec.onend = () => setListening(false);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  const visibleFields = step ? step.fields.filter((f) => isVisible(f, answers)) : [];
  const multi = visibleFields.find((f) => f.kind === "choice" && f.multiple);
  const picked = multi && Array.isArray(answers[multi.key]) ? (answers[multi.key] as string[]).length : 0;
  const inFlow = (view === "flow" || view === "review") && !!flow;
  const canSpeak = open && !!speechCtor();

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        className={`fixed right-4 bottom-20 z-50 h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-[0_12px_30px_-8px_rgb(14_14_14/0.55)] ring-4 ring-paper transition hover:scale-105 md:right-6 md:bottom-6 md:h-16 md:w-16 ${open ? "hidden sm:flex" : "flex"}`}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        aria-controls={open ? "fa-chat" : undefined}
      >
        {open ? (
          <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" />
            <path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" strokeWidth="2.6" />
          </svg>
        )}
      </button>

      {open && (
        <div
          id="fa-chat"
          role="dialog"
          aria-label={UI.title.en}
          dir={rtl ? "rtl" : "ltr"}
          lang={lang === "ur" ? "ur" : "en"}
          className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#f5f4f0] sm:inset-auto sm:right-6 sm:bottom-28 sm:h-[min(680px,calc(100vh-200px))] sm:w-[420px] sm:rounded-[28px] sm:shadow-[0_30px_80px_-20px_rgb(14_14_14/0.45)] ${rtl ? "font-urdu leading-loose" : ""}`}
        >
          {/* Header: white on phones, black on larger screens */}
          <header className="shrink-0 border-b border-line bg-paper px-4 pt-4 pb-3 text-ink sm:border-0 sm:bg-ink sm:px-5 sm:pt-5 sm:text-paper">
            <div className="flex items-center gap-3">
              {inFlow && (
                <button type="button" onClick={back} aria-label={tx(COPY.back)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist text-ink hover:bg-line sm:bg-white/10 sm:text-paper sm:hover:bg-white/20">
                  <Chevron className="h-5 w-5 rotate-180 rtl:rotate-0" />
                </button>
              )}
              <Avatar size="lg" />
              <div className="min-w-0 flex-1" dir="ltr">
                <p className={`truncate text-[17px] font-semibold ${rtl ? "font-sans" : ""}`}>Friends Assistant</p>
                <p className={`truncate text-[13px] text-muted sm:text-faint ${rtl ? "font-urdu text-end" : ""}`} dir={rtl ? "rtl" : "ltr"}>
                  {inFlow ? tx(flow!.label) : tx(COPY.online)}
                </p>
              </div>
              <button type="button" onClick={reset} aria-label={tx(COPY.restart)} title={tx(COPY.restart)} className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex">
                <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
                </svg>
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label={tx(COPY.close)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist hover:bg-line sm:hidden">
                <Chevron className="h-5 w-5 rotate-90" />
              </button>
            </div>
            {/* Language switch */}
            <div role="group" aria-label="Language" dir="ltr" className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-mist p-1 sm:bg-white/10">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => chooseLang(l.key)}
                  aria-pressed={lang === l.key}
                  className={`rounded-full py-2 text-sm transition ${l.key === "ur" ? "font-urdu" : "font-sans"} ${lang === l.key ? "bg-paper font-semibold text-ink shadow-sm" : "text-muted hover:text-ink sm:text-faint sm:hover:text-paper"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </header>

          {/* Conversation */}
          <div ref={bodyRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 text-[15px]" aria-live="polite">
            <p className="text-center text-xs tracking-[0.18em] text-muted uppercase">{tx(COPY.today)}</p>
            <BotRow>
              <p className={`font-semibold ${rtl ? "text-xl" : "text-[17px]"}`}>{tx(COPY.hello)}</p>
              <p className="mt-1 text-body">{tx(COPY.helloLine)}</p>
            </BotRow>

            {view === "menu" && (
              <div className="space-y-2.5 ps-11">
                {FLOWS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => startFlow(f.key)}
                    className="flex w-full items-center gap-3.5 rounded-[20px] border border-line bg-paper p-3.5 text-start transition hover:border-ink"
                  >
                    <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TILE[f.key]}`}>
                      <FlowIcon k={f.key} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{tx(f.label)}</span>
                      <span className="block truncate text-sm text-muted">{tx(SUBTITLES[f.key])}</span>
                    </span>
                    <Chevron className="h-5 w-5 shrink-0 text-muted rtl:rotate-180" />
                  </button>
                ))}
              </div>
            )}

            {log.map((b, i) =>
              b.role === "bot" ? (
                <BotRow key={i}>
                  <p className="whitespace-pre-line text-body">{b.text}</p>
                  {b.link && (
                    <Link href={b.link.href} onClick={() => setOpen(false)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-body">
                      {b.link.label} <Chevron className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                  )}
                </BotRow>
              ) : (
                <UserRow key={i}>{b.text}</UserRow>
              ),
            )}
            {ask.isPending && (
              <BotRow>
                <span className="flex gap-1.5 py-1.5" aria-label="…">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
                  ))}
                </span>
              </BotRow>
            )}

            {view === "menu" && (
              <>
                <div className="ps-11">
                  <p className="text-sm text-muted">{tx(COPY.often)}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {QUICK.map((q) => (
                      <button key={q.key} type="button" onClick={() => quick(q)} className="rounded-full border border-line-strong bg-paper px-4 py-2 text-sm text-ink transition hover:border-ink">
                        {tx(q.label)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ms-11">
                  <PersonCard tx={tx} />
                </div>
              </>
            )}

            {view === "flow" && flow && step && (
              <>
                {stepIdx === 0 && <BotRow>{tx(flow!.intro)}</BotRow>}
                <section className="rounded-[24px] border border-line bg-paper p-4 sm:ms-11 sm:p-5" aria-labelledby="chat-step-title">
                  <div className="flex items-center gap-3" dir="ltr">
                    <div className="flex flex-1 gap-1.5" aria-hidden>
                      {flow!.steps.map((s, i) => (
                        <span key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-ink" : "bg-line"}`} />
                      ))}
                    </div>
                    <span className="shrink-0 text-sm text-muted">
                      {stepIdx + 1} {tx(UI.of)} {flow!.steps.length}
                    </span>
                  </div>
                  <h3 id="chat-step-title" className={`mt-4 font-semibold text-ink ${rtl ? "text-xl" : "text-[19px] leading-snug"}`}>
                    {tx(step.title)}
                  </h3>

                  {step.results && <ResultsList results={results} loading={match.isPending} tx={tx} onBook={() => document.getElementById("chat-f-name")?.focus()} />}

                  <div className="mt-4 space-y-5">
                    {visibleFields.map((f) => (
                      <FieldInput key={f.key} field={f} value={answers[f.key]} onChange={(v) => setAnswer(f, v)} tx={tx} />
                    ))}
                  </div>
                  <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />

                  {problem && (
                    <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                      {problem}
                    </p>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                      {tx(COPY.talkInstead)}
                    </a>
                    <button
                      type="button"
                      onClick={next}
                      disabled={lead.isPending}
                      className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-ink px-6 font-semibold whitespace-nowrap text-paper transition hover:bg-body disabled:opacity-60"
                    >
                      {stepIdx === flow!.steps.length - 1 ? tx(COPY.review) : tx(UI.next)}
                      {picked > 0 && stepIdx < flow!.steps.length - 1 && <span aria-hidden>· {picked}</span>}
                      <Chevron className="h-4 w-4 rtl:rotate-180" />
                    </button>
                  </div>
                </section>
              </>
            )}

            {view === "review" && flow && (
              <section className="rounded-[24px] border border-line bg-paper p-4 sm:ms-11 sm:p-5" aria-labelledby="chat-review-title">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 4h6a2 2 0 0 1 2 2h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1a2 2 0 0 1 2-2M8.5 13l2.5 2.5 5-5" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 id="chat-review-title" className={`font-semibold text-ink ${rtl ? "text-xl" : "text-[19px] leading-snug"}`}>
                      {tx(COPY.reviewTitle)}
                    </h3>
                    <p className="truncate text-sm text-muted">{tx(flow.label)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-body">{tx(COPY.reviewHint)}</p>

                <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
                  {flow.steps.map((st, i) => {
                    const items = st.fields.filter((f) => isVisible(f, answers) && answered(answers[f.key]));
                    if (items.length === 0) return null;
                    return (
                      <div key={st.key} className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold tracking-[0.1em] text-muted uppercase">
                            {i === flow.steps.length - 1 ? tx(COPY.yourDetails) : tx(st.title)}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setStepIdx(i);
                              setView("flow");
                            }}
                            className="shrink-0 rounded-full border border-line-strong px-3 py-1 text-xs font-semibold text-ink hover:border-ink"
                          >
                            {tx(COPY.edit)}
                          </button>
                        </div>
                        <dl className="mt-2 space-y-2">
                          {items.map((f) => (
                            <div key={f.key} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 text-sm">
                              <dt className="text-muted">{tx(f.label)}</dt>
                              <dd className={`font-medium text-ink ${f.key === "phone" ? "whitespace-nowrap" : ""}`} dir={f.key === "phone" ? "ltr" : undefined}>
                                {answerLabel(flow, f.key, answers[f.key], lang)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    );
                  })}
                </div>
                <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />

                {problem && (
                  <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                    {problem}
                  </p>
                )}
                <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <button type="button" onClick={back} className="min-h-12 rounded-full border-[1.5px] border-line-strong px-5 text-sm font-semibold text-ink hover:border-ink">
                    {tx(COPY.edit)}
                  </button>
                  <button
                    type="button"
                    onClick={() => lead.mutate()}
                    disabled={lead.isPending}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 font-semibold whitespace-nowrap text-paper hover:bg-body disabled:opacity-60"
                  >
                    {lead.isPending ? tx(UI.sending) : tx(UI.submit)}
                    <Chevron className="h-4 w-4 rtl:rotate-180" />
                  </button>
                </div>
              </section>
            )}

            {view === "done" && (
              <>
                <BotRow>
                  <p className="text-body">{tx(UI.thanks)}</p>
                </BotRow>
                <div className="ms-11 space-y-3">
                  <PersonCard tx={tx} />
                  <button type="button" onClick={reset} className="w-full rounded-full border border-line-strong bg-paper px-4 py-3 text-sm font-semibold text-ink hover:border-ink">
                    {tx(UI.restart)}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Free text */}
          <div className="shrink-0 border-t border-line bg-paper px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <form
              className="flex items-center gap-2 rounded-full bg-mist p-1.5 ps-5"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={500}
                dir="auto"
                aria-label={tx(UI.typeHere)}
                placeholder={tx(inFlow ? COPY.describe : COPY.ask)}
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-muted"
              />
              {canSpeak && (
                <button
                  type="button"
                  onClick={listen}
                  aria-label={tx(COPY.listen)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${listening ? "animate-pulse bg-red-50 text-red-700" : "text-body hover:bg-line"}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                </button>
              )}
              <button type="submit" disabled={ask.isPending || !input.trim()} aria-label={tx(UI.send)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-body disabled:opacity-40">
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
                </svg>
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-muted">{tx(COPY.note)}</p>
          </div>
        </div>
      )}
    </>
  );
}

const answered = (v: string | string[] | undefined) => (Array.isArray(v) ? v.length > 0 : !!v && v.trim() !== "");

function Avatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  if (size === "sm") {
    return (
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-[17px] text-paper">
        F
      </span>
    );
  }
  return (
    <span aria-hidden className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink p-[3px] ring-2 ring-[#c9a15a] sm:bg-paper">
      <span className="flex h-full w-full items-center justify-center rounded-full bg-ink font-serif text-[26px] leading-none text-paper sm:bg-paper sm:text-ink">F</span>
      <span className="absolute -right-0.5 -bottom-0.5 h-4 w-4 rounded-full bg-emerald-600 ring-[3px] ring-paper sm:ring-ink" />
    </span>
  );
}

function BotRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3">
      <Avatar />
      <div className="min-w-0 flex-1 rounded-[22px] rounded-es-md border border-line bg-paper px-5 py-4 leading-relaxed text-ink">{children}</div>
    </div>
  );
}

function UserRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end ps-12">
      <p className="rounded-[22px] rounded-ee-md bg-ink px-5 py-3 whitespace-pre-line text-paper">{children}</p>
    </div>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function FlowIcon({ k }: { k: FlowKey }) {
  const common = { viewBox: "0 0 24 24", className: "h-6 w-6", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (k === "architecture")
    return (
      <svg {...common}>
        <path d="M3 21h18M5 21V10l7-6 7 6v11M9.5 21v-5h5v5M9 12h1.5M13.5 12H15" />
      </svg>
    );
  if (k === "construction")
    return (
      <svg {...common}>
        <path d="M3 21h18M6 21V8h5v13M11 12h7v9M8 11h1M8 14h1M8 17h1M14 15h1M14 18h1M6 8l2.5-4L11 8" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5" />
    </svg>
  );
}

function PersonCard({ tx }: { tx: Tx }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[22px] border border-line bg-paper py-3 ps-4 pe-3 sm:gap-3 sm:ps-5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink sm:text-[15px]">{tx(COPY.person)}</p>
        <a href={TEL} dir="ltr" className="mt-0.5 block text-[13px] font-semibold whitespace-nowrap text-muted hover:text-ink sm:text-sm">
          {BRAND.phone}
        </a>
      </div>
      <a href={TEL} aria-label={`${tx(UI.call)} ${BRAND.phone}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper hover:bg-body">
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
      </a>
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label={tx(UI.whatsapp)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
        </svg>
      </a>
    </div>
  );
}

function FieldInput({ field, value, onChange, tx }: { field: Field; value: string | string[] | undefined; onChange: (v: string) => void; tx: Tx }) {
  const id = `chat-f-${field.key}`;
  if (field.kind === "text") {
    return (
      <label htmlFor={id} className="block">
        <span className="text-sm font-medium text-body">
          {tx(field.label)}
          {field.required && <span className="text-red-600"> *</span>}
        </span>
        <input
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.max}
          inputMode={field.inputMode}
          type={field.inputMode === "tel" ? "tel" : "text"}
          dir={field.inputMode === "tel" ? "ltr" : "auto"}
          placeholder={field.placeholder ? tx(field.placeholder) : undefined}
          autoComplete={field.key === "name" ? "name" : field.key === "phone" ? "tel" : "off"}
          className="mt-1.5 w-full rounded-2xl border-[1.5px] border-line-strong bg-paper px-4 py-3 text-[15px] text-ink outline-none focus:border-ink"
        />
      </label>
    );
  }
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <fieldset>
      <legend className="text-sm text-muted">
        {tx(field.label)}
        {field.required && <span className="text-red-600"> *</span>}
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {field.options.map((o) => {
          const on = selected.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.key)}
              className={`inline-flex items-center gap-2.5 rounded-full border-[1.5px] py-2.5 ps-3 pe-4 text-[15px] transition ${on ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper text-ink hover:border-ink"}`}
            >
              <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${on ? "bg-[#c9a15a] text-ink" : "border-[1.5px] border-line-strong"}`}>
                {on && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L19 7" />
                  </svg>
                )}
              </span>
              {tx(o.label)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ResultsList({ results, loading, tx, onBook }: { results: Results | null; loading: boolean; tx: Tx; onBook: () => void }) {
  if (loading || !results) {
    return (
      <div className="mt-4 flex gap-3" aria-label="…">
        {[0, 1].map((i) => (
          <div key={i} className="h-56 w-64 shrink-0 animate-pulse rounded-[20px] bg-mist" />
        ))}
      </div>
    );
  }
  if (results.listings.length === 0 && results.investments.length === 0) {
    return <p className="mt-4 rounded-2xl bg-mist p-4 text-sm text-body">{tx(UI.noResults)}</p>;
  }
  return (
    <div className="mt-4">
      {results.listings.length > 0 && (
        <>
          <p className="mb-3 text-sm text-muted">
            <b className="text-ink">{results.listings.length}</b> {tx(COPY.found)}
          </p>
          <ul className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2" dir="ltr">
            {results.listings.map((l) => {
              const rent = l.listingType === "rent";
              return (
                <li key={l.id} className="w-[250px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-line bg-paper">
                  <HomeImage src={l.image} alt={l.title} className="h-32" sizes="250px">
                    <div className="p-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rent ? "bg-[#ece8f5] text-[#5b3f91]" : "bg-ink text-paper"}`}>{tx(rent ? COPY.rent : COPY.sale)}</span>
                    </div>
                  </HomeImage>
                  <div className="p-4">
                    <p className="truncate font-semibold text-ink">{l.title}</p>
                    <p className="truncate text-sm text-muted">{[l.locality, l.projectName ?? l.city].filter(Boolean).join(" · ")}</p>
                    <p className="mt-2 text-lg font-semibold text-ink">
                      {formatPkr(l.price)}
                      {rent && <span className="text-sm font-normal text-muted"> {tx(UI.perMonth)}</span>}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link href={propertyPath(l)} className="rounded-full border-[1.5px] border-line-strong py-2 text-center text-sm font-semibold text-ink hover:border-ink">
                        {tx(COPY.details)}
                      </Link>
                      <button type="button" onClick={onBook} className="rounded-full bg-ink py-2 text-sm font-semibold text-paper hover:bg-body">
                        {tx(COPY.bookVisit)}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {results.investments.length > 0 && (
        <ul className="space-y-2">
          {results.investments.map((i) => (
            <li key={i.slug}>
              <Link href={`/investment/${i.slug}`} className="block rounded-2xl border border-line p-4 hover:border-ink">
                <p className="font-semibold text-ink">{i.title}</p>
                <p className="text-sm text-muted" dir="ltr">
                  {tx(UI.from)} {formatPkr(i.minimum)} · {i.duration}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
