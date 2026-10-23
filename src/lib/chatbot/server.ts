import { BUDGET_BANDS, SIZE_BANDS } from "../catalog";
import { after } from "next/server";
import { createLead, getPropertiesWithProject, getPublishedInvestments, type NewLead } from "../data";
import { sendNewLeadEmails } from "../email";
import { answerLabel, fieldLabel, type Answers, type Flow, type Lang } from "./flow";

const CITY_NAMES: Record<string, string> = { rahim_yar_khan: "Rahim Yar Khan", lahore: "Lahore", karachi: "Karachi" };

export type ListingResult = { id: string; slug: string | null; image: string; projectName: string | null; title: string; price: number; listingType: string; size: string; locality: string; city: string };
export type InvestmentResult = { slug: string; title: string; minimum: number; duration: string };

/** Listings or investment opportunities that match the visitor's answers (properties flow only). */
export async function matchResults(answers: Answers): Promise<{ listings: ListingResult[]; investments: InvestmentResult[] }> {
  const intent = answers.intent;
  if (intent === "invest") {
    const type = answers.investment_type;
    const all = (await getPublishedInvestments()).filter((i) => i.status === "open");
    const picked = type && type !== "any" ? all.filter((i) => i.investmentType === type) : all;
    return {
      listings: [],
      investments: (picked.length ? picked : all).slice(0, 4).map((i) => ({ slug: i.slug, title: i.title, minimum: i.minimumInvestmentPkr, duration: i.expectedDuration })),
    };
  }
  if (intent !== "buy" && intent !== "rent") return { listings: [], investments: [] };

  const listingType = intent === "rent" ? "rent" : "sale";
  const budget = BUDGET_BANDS[listingType].find((b) => b.key === (intent === "rent" ? answers.budget_rent : answers.budget_sale));
  const size = SIZE_BANDS.find((s) => s.key === answers.size_band);
  const city = CITY_NAMES[String(answers.city)];
  const base = {
    listingType,
    status: "Available",
    publishedOnly: true,
    type: typeof answers.property_type === "string" ? answers.property_type : undefined,
    city,
  };
  const narrow = await getPropertiesWithProject(
    {
      ...base,
      minPrice: budget?.min,
      maxPrice: budget?.max,
      minMarla: size && "min" in size ? size.min : undefined,
      maxMarla: size && "max" in size ? size.max : undefined,
      locality: typeof answers.locality === "string" ? answers.locality : undefined,
    },
    4,
  );
  // If the exact filters find nothing, fall back to the same type in the same city so the visitor still sees options.
  const rows = narrow.length ? narrow : await getPropertiesWithProject(base, 4);
  return {
    investments: [],
    listings: rows.map((p) => ({ id: p.id, slug: p.slug, image: p.image_path, projectName: p.project_name ?? null, title: p.title, price: p.price_pkr, listingType: p.listing_type, size: p.size, locality: p.locality, city: p.city })),
  };
}

/** Stores a completed chatbot conversation as a lead on the Sales desk, in English for staff. */
export async function saveChatLead(flow: Flow, answers: Answers, lang: Lang, shownListingIds: string[]) {
  const a = (k: string) => (answers[k] === undefined ? "" : answerLabel(flow, k, answers[k]));
  const city = CITY_NAMES[String(answers.city)] ?? "";

  const headline: Record<Flow["key"], string> = {
    architecture: `${a("project_type")} — ${a("services")}`,
    construction: `${a("work")} — ${a("building_type")}`,
    properties:
      answers.intent === "invest"
        ? `Invest — ${a("investment_type")}`
        : `${a("intent")} — ${a("property_type")}${answers.locality ? `, ${answers.locality}` : ""}`,
  };

  const details: Record<string, string> = { language: lang === "ur" ? "Urdu" : lang === "roman" ? "Roman Urdu" : "English", flow: flow.label.en };
  for (const step of flow.steps) {
    for (const f of step.fields) {
      if (["name", "phone"].includes(f.key) || answers[f.key] === undefined) continue;
      details[fieldLabel(flow, f.key)] = a(f.key);
    }
  }
  if (shownListingIds.length) details["Listings shown"] = String(shownListingIds.length);

  const input: NewLead = {
    name: String(answers.name),
    phone: String(answers.phone),
    city,
    source: "chatbot",
    interest: `Chatbot: ${headline[flow.key]}`.slice(0, 150),
    service: flow.label.en,
    location: [answers.locality, city].filter(Boolean).join(", "),
    size: String(answers.land_size ?? answers.area ?? answers.size_text ?? a("size_band") ?? ""),
    budget: a("budget") || a("budget_sale") || a("budget_rent") || a("invest_amount") || String(answers.expected_price ?? ""),
    message: `Preferred contact: ${a("contact_method")}`,
    details,
    propertyId: shownListingIds.length === 1 ? shownListingIds[0] : null,
  };
  const row = await createLead(input);
  after(() => sendNewLeadEmails({ ...input, id: row.id }));
  return row;
}
