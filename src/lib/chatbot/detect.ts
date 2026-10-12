/**
 * Language and intent detection for typed messages. Pure functions, used by the chat API.
 * Detection only chooses which guided card to open and which answer to pre-tick; it never answers facts.
 */
import type { Answers, FlowKey, Lang } from "./flow";

const URDU_SCRIPT = /[؀-ۿ]/;

/** Common Roman Urdu words that rarely appear in English sentences. */
const ROMAN_WORDS = new Set([
  "hai", "hain", "hy", "chahiye", "chahye", "chaiye", "kya", "kia", "mujhe", "mujhy", "aap", "ap", "karna", "krna",
  "karwana", "banwana", "banana", "kitna", "kitni", "kitne", "kahan", "kidhar", "mein", "main", "nahi", "nai", "ghar",
  "makan", "kiraya", "kiraye", "khareedna", "kharidna", "bechna", "naqsha", "naksha", "batain", "bataen", "bata",
  "plz", "bhai", "sahab", "acha", "theek", "jee", "ji", "wala", "wali", "ka", "ki", "ke", "ko", "se", "aur",
]);

/** Words that on their own clearly mark Roman Urdu (short words like "ka" or "main" need company). */
const STRONG_ROMAN = new Set(["chahiye", "chahye", "chaiye", "karwana", "banwana", "kiraya", "kiraye", "naqsha", "naksha", "batain", "bataen", "kitna", "kahan", "mujhe", "kya", "hai", "hain"]);

export function detectLanguage(text: string): Lang {
  if (URDU_SCRIPT.test(text)) return "ur";
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = words.filter((w) => ROMAN_WORDS.has(w));
  return hits.length >= 2 || hits.some((w) => STRONG_ROMAN.has(w)) ? "roman" : "en";
}

type Rule = { test: RegExp; flow: FlowKey; prefill?: Answers };

/** Order matters: the first matching rule wins, so specific projects come before generic words. */
const RULES: Rule[] = [
  { test: /petrol\s*pump|پٹرول\s*پمپ|پیٹرول/i, flow: "architecture", prefill: { project_type: "petrol_pump", services: ["noc"] } },
  { test: /\blpg\b|ایل\s*پی\s*جی|گیس\s*پلانٹ/i, flow: "architecture", prefill: { project_type: "lpg_timber", services: ["noc"] } },
  { test: /timber|lakri|لکڑی|ٹمبر/i, flow: "architecture", prefill: { project_type: "lpg_timber" } },
  { test: /flour\s*mill|atta|chakki|آٹا|فلور\s*مل|چکی/i, flow: "architecture", prefill: { project_type: "flour_mill" } },
  { test: /oil\s*mill|آئل\s*مل|تیل/i, flow: "architecture", prefill: { project_type: "oil_mill" } },
  { test: /cotton|textile|ginning|کاٹن|ٹیکسٹائل|جننگ/i, flow: "architecture", prefill: { project_type: "cotton" } },
  { test: /hospital|clinic|ہسپتال|کلینک/i, flow: "architecture", prefill: { project_type: "hospital" } },
  { test: /school|college|اسکول|سکول|کالج/i, flow: "architecture", prefill: { project_type: "school" } },
  { test: /hotel|restaurant|ہوٹل|ریسٹورنٹ/i, flow: "architecture", prefill: { project_type: "hotel" } },
  { test: /\bnoc\b|approval|این\s*او\s*سی|منظوری/i, flow: "architecture", prefill: { services: ["noc"] } },
  { test: /soil|مٹی/i, flow: "architecture", prefill: { services: ["soil"] } },
  { test: /\bboq\b|estimat|lagat|kharcha|تخمینہ|لاگت/i, flow: "architecture", prefill: { services: ["boq"] } },
  { test: /structur(al)?\s*draw|اسٹرکچرل/i, flow: "architecture", prefill: { services: ["structural"] } },
  { test: /\b3d\b|elevation|ایلیویشن/i, flow: "architecture", prefill: { services: ["elevation_3d"] } },
  { test: /map\s*print|پرنٹ/i, flow: "architecture", prefill: { services: ["map_printing"] } },
  { test: /naq?sha|naksha|house\s*plan|floor\s*plan|drawing|نقشہ|ڈرائنگ/i, flow: "architecture", prefill: { services: ["house_plan"], project_type: "house" } },
  { test: /waterproof|seepage|seelan|leak|damp|سیلن|واٹر\s*پروف|لیکیج|ٹپک/i, flow: "construction", prefill: { work: "waterproofing" } },
  { test: /chemical|termite|deemak|دیمک|کیمیکل/i, flow: "construction", prefill: { work: "chemicals" } },
  { test: /grey\s*structure|gray\s*structure|dhancha|ڈھانچہ|گرے\s*اسٹرکچر/i, flow: "construction", prefill: { work: "grey_structure" } },
  { test: /renovat|marammat|مرمت/i, flow: "construction", prefill: { work: "renovation" } },
  { test: /reconstruct|dobara\s*tameer|دوبارہ\s*تعمیر/i, flow: "construction", prefill: { work: "reconstruction" } },
  { test: /invest|sarmaya|سرمایہ/i, flow: "properties", prefill: { intent: "invest" } },
  { test: /\brent\b|kiraya|kiraye|کرایہ|کرائے/i, flow: "properties", prefill: { intent: "rent" } },
  { test: /\bsell\b|bechna|bech|farokht|فروخت|بیچنا/i, flow: "properties", prefill: { intent: "sell" } },
  { test: /\bbuy\b|khareed|kharid|purchase|خرید/i, flow: "properties", prefill: { intent: "buy" } },
  { test: /construction|tameer|banwana|build|تعمیر|بنوانا/i, flow: "construction" },
  { test: /\bplot\b|makan|\bghar\b|\bhouse\b|\bshop\b|dukan|property|پلاٹ|مکان|گھر|دکان|پراپرٹی/i, flow: "properties" },
];

export function detectIntent(text: string): { flow: FlowKey; prefill: Answers } | null {
  const rule = RULES.find((r) => r.test.test(text));
  return rule ? { flow: rule.flow, prefill: rule.prefill ?? {} } : null;
}
