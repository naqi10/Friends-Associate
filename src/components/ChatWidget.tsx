"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BRAND } from "@/lib/brand";
import {
  FLOWS,
  UI,
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

type View = "lang" | "menu" | "flow" | "done";
type Bubble = { role: "user" | "bot"; text: string };
type Results = {
  listings: { id: string; title: string; price: number; listingType: string; size: string; locality: string; city: string }[];
  investments: { slug: string; title: string; minimum: number; duration: string }[];
};

const LANG_KEY = "fa-chat-lang";
const LANGS: { key: Lang; label: string }[] = [
  { key: "en", label: "English" },
  { key: "ur", label: "اردو" },
  { key: "roman", label: "Roman Urdu" },
];
const WHATSAPP = `https://wa.me/${BRAND.phoneIntl.replace(/\D/g, "")}`;
const TEL = `tel:${BRAND.phoneIntl.replace(/\s/g, "")}`;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [view, setView] = useState<View>("lang");
  const [flowKey, setFlowKey] = useState<FlowKey | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [log, setLog] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const flow = flowKey ? getFlow(flowKey) : undefined;
  const step = flow?.steps[stepIdx];
  const rtl = lang === "ur";
  const tx = (v: Record<Lang, string>) => v[lang];

  /** On first open, restore the visitor's saved language. Storage may be unavailable (private mode). */
  function toggleOpen() {
    if (!open && view === "lang") {
      try {
        const saved = localStorage.getItem(LANG_KEY) as Lang | null;
        if (saved && LANGS.some((l) => l.key === saved)) {
          setLang(saved);
          setView("menu");
        }
      } catch {
        /* ignore */
      }
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [log, view, stepIdx, results]);

  function chooseLang(l: Lang) {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
    if (view === "lang") setView("menu");
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
      if (res.action) startFlow(res.action.flow, res.action.prefill);
    },
    onError: () => setLog((l) => [...l, { role: "bot", text: tx(UI.failed) }]),
  });

  function startFlow(key: FlowKey, prefill: Answers = {}) {
    setFlowKey(key);
    setAnswers(prefill);
    setStepIdx(0);
    setProblem(null);
    setResults(null);
    setView("flow");
  }

  function goMenu() {
    setFlowKey(null);
    setAnswers({});
    setStepIdx(0);
    setProblem(null);
    setResults(null);
    setView("menu");
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
      lead.mutate();
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
    if (stepIdx === 0) goMenu();
    else setStepIdx(stepIdx - 1);
  }

  function send() {
    const text = input.trim().slice(0, 500);
    if (!text || ask.isPending) return;
    setInput("");
    setLog((l) => [...l, { role: "user", text }]);
    if (view === "lang") setView("menu");
    ask.mutate(text);
  }

  const visibleFields = step ? step.fields.filter((f) => isVisible(f, answers)) : [];

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 md:bottom-6 items-center justify-center rounded-full bg-ink text-2xl text-paper shadow-lg ring-2 ring-paper hover:bg-body"
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        aria-controls={open ? "fa-chat" : undefined}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div
          id="fa-chat"
          role="dialog"
          aria-label={UI.title.en}
          dir={rtl ? "rtl" : "ltr"}
          lang={lang === "ur" ? "ur" : "en"}
          className={`fixed inset-x-2 bottom-36 top-20 z-50 flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl sm:inset-auto sm:bottom-24 sm:right-4 sm:h-[min(640px,78vh)] sm:w-[400px] ${rtl ? "font-urdu leading-loose" : ""}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-teal-800 px-4 py-3 text-white">
            <p className="text-sm font-semibold">{tx(UI.title)}</p>
            <div className="flex gap-1" dir="ltr" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => chooseLang(l.key)}
                  aria-pressed={lang === l.key && view !== "lang"}
                  className={`rounded px-1.5 py-0.5 text-[11px] ${lang === l.key && view !== "lang" ? "bg-white text-teal-900" : "text-teal-100 hover:bg-teal-700"} ${l.key === "ur" ? "font-urdu" : "font-sans"}`}
                >
                  {l.key === "roman" ? "Roman" : l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-stone-50 p-3 text-sm" aria-live="polite">
            {view === "lang" ? (
              <div className="space-y-3">
                <Bot>
                  {UI.greeting.en}
                  <br />
                  <span className="font-urdu leading-loose" dir="rtl">
                    {UI.greeting.ur}
                  </span>
                </Bot>
                <p className="px-1 text-xs font-medium text-stone-500">{UI.chooseLanguage.en} / {UI.chooseLanguage.roman}</p>
                <div className="grid gap-2">
                  {LANGS.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => chooseLang(l.key)}
                      className={`rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-left font-medium hover:border-teal-500 ${l.key === "ur" ? "font-urdu text-right" : ""}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Bot>{tx(UI.greeting)}</Bot>

                {view === "menu" && (
                  <div className="grid gap-2">
                    {FLOWS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => startFlow(f.key)}
                        className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 text-start font-medium hover:border-teal-500"
                      >
                        <span aria-hidden className="text-xl">
                          {f.icon}
                        </span>
                        {tx(f.label)}
                      </button>
                    ))}
                    <TeamButtons tx={tx} />
                  </div>
                )}

                {log.map((b, i) => (b.role === "bot" ? <Bot key={i}>{b.text}</Bot> : <Me key={i}>{b.text}</Me>))}
                {ask.isPending && <Bot muted>…</Bot>}

                {view === "flow" && flow && step && (
                  <section className="rounded-xl border border-stone-200 bg-white p-3" aria-labelledby="chat-step-title">
                    {stepIdx === 0 && <p className="mb-2 text-xs text-stone-500">{tx(flow.intro)}</p>}
                    <p className="text-[11px] font-medium uppercase tracking-wide text-teal-700">
                      {flow.icon} {tx(flow.label)} · {tx(UI.step)} {stepIdx + 1} {tx(UI.of)} {flow.steps.length}
                    </p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                      <div className="h-full bg-teal-600 transition-all" style={{ width: `${((stepIdx + 1) / flow.steps.length) * 100}%` }} />
                    </div>
                    <h3 id="chat-step-title" className="mt-3 font-semibold">
                      {tx(step.title)}
                    </h3>

                    {step.results && <ResultsList results={results} loading={match.isPending} tx={tx} />}

                    <div className="mt-3 space-y-4">
                      {visibleFields.map((f) => (
                        <FieldInput key={f.key} field={f} value={answers[f.key]} onChange={(v) => setAnswer(f, v)} tx={tx} />
                      ))}
                    </div>
                    <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />

                    {problem && (
                      <p role="alert" className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-800">
                        {problem}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button type="button" onClick={back} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-medium hover:bg-stone-50">
                        {stepIdx === 0 ? tx(UI.menu) : tx(UI.back)}
                      </button>
                      <button
                        type="button"
                        onClick={next}
                        disabled={lead.isPending}
                        className="rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-60"
                      >
                        {stepIdx === flow.steps.length - 1 ? (lead.isPending ? tx(UI.sending) : tx(UI.submit)) : tx(UI.next)}
                      </button>
                    </div>
                  </section>
                )}

                {view === "done" && (
                  <div className="space-y-3">
                    <Bot>{tx(UI.thanks)}</Bot>
                    <TeamButtons tx={tx} />
                    <button type="button" onClick={goMenu} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium hover:bg-stone-50">
                      {tx(UI.restart)}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Free text */}
          <form
            className="flex gap-2 border-t border-stone-200 bg-white p-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              dir="auto"
              aria-label={tx(UI.typeHere)}
              placeholder={tx(UI.typeHere)}
              className="min-w-0 flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm"
            />
            <button type="submit" disabled={ask.isPending || !input.trim()} className="rounded-md bg-teal-800 px-3 py-2 text-sm text-white disabled:opacity-50">
              {tx(UI.send)}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bot({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`me-8 whitespace-pre-line rounded-2xl rounded-ss-sm bg-white px-3 py-2 shadow-sm ${muted ? "animate-pulse text-stone-400" : "text-stone-800"}`}>
      {children}
    </div>
  );
}

function Me({ children }: { children: React.ReactNode }) {
  return <div className="ms-8 whitespace-pre-line rounded-2xl rounded-se-sm bg-teal-700 px-3 py-2 text-white">{children}</div>;
}

function TeamButtons({ tx }: { tx: (v: Record<Lang, string>) => string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-xs font-medium text-stone-500">👨‍💼 {tx(UI.talkToTeam)}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
        <a href={TEL} className="rounded-md bg-teal-800 px-3 py-2 text-center text-white">
          📞 {tx(UI.call)} {BRAND.phone}
        </a>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="rounded-md border border-teal-800 px-3 py-2 text-center text-teal-900">
          💬 {tx(UI.whatsapp)}
        </a>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  tx,
}: {
  field: Field;
  value: string | string[] | undefined;
  onChange: (v: string) => void;
  tx: (v: Record<Lang, string>) => string;
}) {
  const id = `chat-f-${field.key}`;
  if (field.kind === "text") {
    return (
      <label htmlFor={id} className="block">
        <span className="text-xs font-medium text-stone-700">
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
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
    );
  }
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <fieldset>
      <legend className="text-xs font-medium text-stone-700">
        {tx(field.label)}
        {field.required && <span className="text-red-600"> *</span>}
      </legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {field.options.map((o) => {
          const on = selected.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.key)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-teal-500"}`}
            >
              {field.multiple && <span aria-hidden>{on ? "✓ " : "+ "}</span>}
              {tx(o.label)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ResultsList({ results, loading, tx }: { results: Results | null; loading: boolean; tx: (v: Record<Lang, string>) => string }) {
  if (loading || !results) return <p className="mt-3 animate-pulse text-xs text-stone-400">…</p>;
  if (results.listings.length === 0 && results.investments.length === 0) {
    return <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900">{tx(UI.noResults)}</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {results.listings.map((l) => (
        <li key={l.id}>
          <Link href={propertyPath(l)} className="block rounded-lg border border-stone-200 p-2 hover:border-teal-500">
            <p className="text-sm font-medium">{l.title}</p>
            <p className="text-xs text-stone-500" dir="ltr">
              {l.size} · {[l.locality, l.city].filter(Boolean).join(", ")}
            </p>
            <p className="text-sm font-semibold text-teal-900" dir="ltr">
              {formatPkr(l.price)} {l.listingType === "rent" && <span className="text-xs font-normal text-stone-500">{tx(UI.perMonth)}</span>}
            </p>
          </Link>
        </li>
      ))}
      {results.investments.map((i) => (
        <li key={i.slug}>
          <Link href={`/investment/${i.slug}`} className="block rounded-lg border border-stone-200 p-2 hover:border-teal-500">
            <p className="text-sm font-medium">{i.title}</p>
            <p className="text-xs text-stone-500" dir="ltr">
              {tx(UI.from)} {formatPkr(i.minimum)} · {i.duration}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
