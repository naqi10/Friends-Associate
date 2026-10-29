/**
 * Guided chatbot conversation: greeting, 3 categories × 4 question cards, in English, Urdu and Roman Urdu.
 * Each card groups the client's parameters into one question with tick/choice options (client brief 06-10-2026).
 * This file is pure data + validation so the browser and server share exactly the same rules.
 */
import { BUDGET_BANDS, SIZE_BANDS } from "../catalog";

export type Lang = "en" | "ur" | "roman";
export type T = Record<Lang, string>;
export type Option = { key: string; label: T };

type ShowIf = { field: string; anyOf: string[] };
export type ChoiceField = { kind: "choice"; key: string; label: T; options: Option[]; multiple?: boolean; required?: boolean; showIf?: ShowIf };
export type TextField = {
  kind: "text";
  key: string;
  label: T;
  placeholder?: T;
  required?: boolean;
  max: number;
  inputMode?: "text" | "numeric" | "tel";
  pattern?: string;
  showIf?: ShowIf;
};
export type Field = ChoiceField | TextField;
export type Step = { key: string; title: T; fields: Field[]; results?: "listings" | "investments" };
export type FlowKey = "architecture" | "construction" | "properties";
export type Flow = { key: FlowKey; icon: string; label: T; intro: T; steps: Step[] };
export type Answers = Record<string, string | string[]>;

const t = (en: string, ur: string, roman: string): T => ({ en, ur, roman });
const opt = (key: string, en: string, ur: string, roman: string): Option => ({ key, label: t(en, ur, roman) });

export const PHONE_PATTERN = "\\+?[0-9][0-9\\s\\-]{6,18}";
const PHONE_RE = new RegExp(`^${PHONE_PATTERN}$`);

// ---------------------------------------------------------------------------
// Shared fields
// ---------------------------------------------------------------------------

const cityField: ChoiceField = {
  kind: "choice",
  key: "city",
  required: true,
  label: t("City", "شہر", "Shehar"),
  options: [
    opt("rahim_yar_khan", "Rahim Yar Khan", "رحیم یار خان", "Rahim Yar Khan"),
    opt("lahore", "Lahore", "لاہور", "Lahore"),
    opt("karachi", "Karachi", "کراچی", "Karachi"),
    opt("other", "Other city", "کوئی اور شہر", "Koi aur shehar"),
  ],
};

/** Name, phone and preferred contact — the last card of every flow ends with these. */
export const CONTACT_FIELDS: Field[] = [
  { kind: "text", key: "name", required: true, max: 120, label: t("Your name", "آپ کا نام", "Aap ka naam") },
  {
    kind: "text",
    key: "phone",
    required: true,
    max: 30,
    inputMode: "tel",
    pattern: PHONE_PATTERN,
    label: t("Phone / WhatsApp", "فون / واٹس ایپ", "Phone / WhatsApp"),
    placeholder: t("03xx-xxxxxxx", "03xx-xxxxxxx", "03xx-xxxxxxx"),
  },
  {
    kind: "choice",
    key: "contact_method",
    required: true,
    label: t("How should we contact you?", "ہم آپ سے کیسے رابطہ کریں؟", "Hum aap se kaise rabta karein?"),
    options: [opt("whatsapp", "WhatsApp", "واٹس ایپ", "WhatsApp"), opt("call", "Phone call", "فون کال", "Phone call")],
  },
];

// ---------------------------------------------------------------------------
// The three flows
// ---------------------------------------------------------------------------

export const FLOWS: Flow[] = [
  {
    key: "architecture",
    icon: "📐",
    label: t("Architecture & Design", "آرکیٹیکچر اور ڈیزائن", "Architecture & Design"),
    intro: t(
      "Planning, drawings, estimation and NOC/approval consultancy. Four quick questions:",
      "نقشہ، ڈرائنگ، تخمینہ اور این او سی کنسلٹنسی۔ چار مختصر سوالات:",
      "Naqsha, drawings, estimate aur NOC consultancy. Chaar chhote sawal:",
    ),
    steps: [
      {
        key: "a1",
        title: t("Which services do you need?", "آپ کو کون سی خدمات چاہئیں؟", "Aap ko kaun si services chahiye?"),
        fields: [
          {
            kind: "choice",
            key: "services",
            multiple: true,
            required: true,
            label: t("Tick all that apply", "جو لاگو ہوں سب منتخب کریں", "Jo bhi chahiye sab select karein"),
            options: [
              opt("house_plan", "House planning / 2D plan", "گھر کا نقشہ / ٹو ڈی پلان", "Ghar ka naqsha / 2D plan"),
              opt("elevation_3d", "3D elevation", "تھری ڈی ایلیویشن", "3D elevation"),
              opt("structural", "Structural drawings", "اسٹرکچرل ڈرائنگ", "Structural drawings"),
              opt("soil", "Soil investigation", "مٹی کی جانچ", "Soil investigation"),
              opt("boq", "Cost estimate / BOQ", "لاگت کا تخمینہ / بی او کیو", "Cost estimate / BOQ"),
              opt("map_printing", "Map printing", "نقشہ پرنٹنگ", "Map printing"),
              opt("noc", "NOC & approvals", "این او سی اور منظوری", "NOC & approvals"),
            ],
          },
        ],
      },
      {
        key: "a2",
        title: t("What type of project is it?", "یہ کس قسم کا پراجیکٹ ہے؟", "Ye kis qism ka project hai?"),
        fields: [
          {
            kind: "choice",
            key: "project_type",
            required: true,
            label: t("Project type", "پراجیکٹ کی قسم", "Project ki qism"),
            options: [
              opt("house", "House / home", "گھر / مکان", "Ghar / makan"),
              opt("commercial", "Plaza / shops / commercial", "پلازہ / دکانیں / کمرشل", "Plaza / dukanein / commercial"),
              opt("petrol_pump", "Petrol pump", "پٹرول پمپ", "Petrol pump"),
              opt("flour_mill", "Flour mill", "فلور مل", "Flour mill"),
              opt("oil_mill", "Oil mill", "آئل مل", "Oil mill"),
              opt("cotton", "Cotton factory / textile", "کاٹن فیکٹری / ٹیکسٹائل", "Cotton factory / textile"),
              opt("lpg_timber", "LPG plant / timber processing", "ایل پی جی پلانٹ / ٹمبر پروسیسنگ", "LPG plant / timber processing"),
              opt("industrial_other", "Other factory / warehouse", "دیگر فیکٹری / گودام", "Doosri factory / godown"),
              opt("hospital", "Hospital / clinic", "ہسپتال / کلینک", "Hospital / clinic"),
              opt("school", "School / college", "اسکول / کالج", "School / college"),
              opt("hotel", "Hotel / restaurant", "ہوٹل / ریسٹورنٹ", "Hotel / restaurant"),
            ],
          },
        ],
      },
      {
        key: "a3",
        title: t("Tell us about the site", "جگہ کے بارے میں بتائیں", "Jagah ke baare mein batayein"),
        fields: [
          cityField,
          {
            kind: "text",
            key: "land_size",
            required: true,
            max: 60,
            label: t("Land / plot size", "زمین / پلاٹ کا سائز", "Zameen / plot ka size"),
            placeholder: t("e.g. 10 Marla, 2 Kanal, 1 Acre", "مثلاً ۱۰ مرلہ، ۲ کنال، ۱ ایکڑ", "Maslan 10 marla, 2 kanal, 1 acre"),
          },
          {
            kind: "choice",
            key: "floors",
            label: t("Floors", "منزلیں", "Manzilein"),
            options: [
              opt("1", "Single storey", "ایک منزل", "Aik manzil"),
              opt("2", "Double storey", "دو منزلیں", "Do manzilein"),
              opt("3plus", "3 or more", "تین یا زیادہ", "Teen ya zyada"),
              opt("na", "Not a building / not sure", "معلوم نہیں", "Pata nahi"),
            ],
          },
          {
            kind: "text",
            key: "front_depth_road",
            max: 80,
            label: t("Front × depth, road width (optional)", "فرنٹ × گہرائی، سڑک کی چوڑائی (اختیاری)", "Front × depth, sarak ki chaurai (optional)"),
            placeholder: t("e.g. 100 × 200 ft, 40 ft road", "مثلاً ۱۰۰ × ۲۰۰ فٹ، ۴۰ فٹ سڑک", "Maslan 100 × 200 ft, 40 ft road"),
          },
        ],
      },
      {
        key: "a4",
        title: t("Documents you already have", "آپ کے پاس موجود کاغذات", "Aap ke paas mojood kaghzaat"),
        fields: [
          {
            kind: "choice",
            key: "documents",
            multiple: true,
            label: t("Tick what you have (send them later on WhatsApp)", "جو موجود ہیں منتخب کریں (بعد میں واٹس ایپ پر بھیجیں)", "Jo mojood hain select karein (baad mein WhatsApp par bhejein)"),
            options: [
              opt("registry", "Registry / sale deed", "رجسٹری / بیع نامہ", "Registry / sale deed"),
              opt("fard", "Fard / jamabandi", "فرد / جمع بندی", "Fard / jamabandi"),
              opt("site_plan", "Aks shajra / site plan", "اکس شجرہ / سائٹ پلان", "Aks shajra / site plan"),
              opt("kml", "KML", "کے ایم ایل", "KML"),
              opt("drawings", "Existing drawings", "موجودہ ڈرائنگز", "Purani drawings"),
              opt("nocs", "Existing NOCs", "موجودہ این او سی", "Pehle se NOC"),
              opt("none", "None yet", "ابھی کچھ نہیں", "Abhi kuch nahi"),
            ],
          },
          ...CONTACT_FIELDS,
        ],
      },
    ],
  },
  {
    key: "construction",
    icon: "🏗️",
    label: t("Construction & Services", "تعمیر اور خدمات", "Construction & Services"),
    intro: t(
      "Construction, renovation, waterproofing and construction chemicals. Four quick questions:",
      "تعمیر، مرمت، واٹر پروفنگ اور کنسٹرکشن کیمیکلز۔ چار مختصر سوالات:",
      "Tameer, renovation, waterproofing aur construction chemicals. Chaar chhote sawal:",
    ),
    steps: [
      {
        key: "c1",
        title: t("What work do you need?", "آپ کو کون سا کام چاہیے؟", "Aap ko kaun sa kaam chahiye?"),
        fields: [
          {
            kind: "choice",
            key: "work",
            required: true,
            label: t("Choose one", "ایک منتخب کریں", "Aik select karein"),
            options: [
              opt("grey_structure", "Grey structure", "گرے اسٹرکچر", "Grey structure"),
              opt("complete", "Complete construction", "مکمل تعمیر", "Mukammal construction"),
              opt("renovation", "Renovation", "مرمت / رینوویشن", "Renovation"),
              opt("reconstruction", "Reconstruction", "دوبارہ تعمیر", "Dobara tameer"),
              opt("waterproofing", "Waterproofing", "واٹر پروفنگ", "Waterproofing"),
              opt("chemicals", "Construction chemicals", "کنسٹرکشن کیمیکلز", "Construction chemicals"),
              opt("consultation", "Consultation only", "صرف مشورہ", "Sirf mashwara"),
            ],
          },
        ],
      },
      {
        key: "c2",
        title: t("Where is the work?", "کام کہاں ہونا ہے؟", "Kaam kahan hona hai?"),
        fields: [
          {
            kind: "choice",
            key: "building_type",
            required: true,
            label: t("Building type", "عمارت کی قسم", "Imarat ki qism"),
            options: [
              opt("house", "House", "گھر", "Ghar"),
              opt("commercial", "Commercial building", "کمرشل عمارت", "Commercial building"),
              opt("industrial", "Factory / industrial", "فیکٹری / انڈسٹریل", "Factory / industrial"),
              opt("other", "Other", "دیگر", "Koi aur"),
            ],
          },
          {
            kind: "choice",
            key: "problem_area",
            multiple: true,
            showIf: { field: "work", anyOf: ["waterproofing", "chemicals", "renovation"] },
            label: t("Which area?", "کون سی جگہ؟", "Kaun si jagah?"),
            options: [
              opt("roof", "Roof", "چھت", "Chhat"),
              opt("water_tank", "Water tank", "پانی کی ٹینکی", "Paani ki tanki"),
              opt("basement", "Basement", "تہہ خانہ", "Basement"),
              opt("bathroom", "Bathroom", "باتھ روم", "Bathroom"),
              opt("dpc", "Foundation / DPC", "بنیاد / ڈی پی سی", "Foundation / DPC"),
              opt("damp_walls", "Wall dampness", "دیواروں میں سیلن", "Deewaron mein seelan"),
              opt("termite", "Termite", "دیمک", "Deemak"),
            ],
          },
          cityField,
        ],
      },
      {
        key: "c3",
        title: t("Size and condition", "سائز اور حالت", "Size aur halat"),
        fields: [
          {
            kind: "text",
            key: "area",
            required: true,
            max: 60,
            label: t("Plot size or covered area", "پلاٹ سائز یا کورڈ ایریا", "Plot size ya covered area"),
            placeholder: t("e.g. 5 Marla, 2,000 sq ft", "مثلاً ۵ مرلہ، ۲۰۰۰ مربع فٹ", "Maslan 5 marla, 2000 sq ft"),
          },
          {
            kind: "choice",
            key: "stage",
            required: true,
            label: t("New or existing?", "نئی یا موجودہ عمارت؟", "Nayi ya purani imarat?"),
            options: [opt("new", "New construction", "نئی تعمیر", "Nayi tameer"), opt("existing", "Existing building", "موجودہ عمارت", "Mojooda imarat")],
          },
          {
            kind: "choice",
            key: "finishing",
            showIf: { field: "work", anyOf: ["complete", "renovation", "reconstruction"] },
            label: t("Finishing level", "فنشنگ کا معیار", "Finishing ka mayaar"),
            options: [opt("standard", "Standard", "عام", "Aam"), opt("premium", "Premium", "اعلیٰ", "Premium"), opt("luxury", "Luxury", "لگژری", "Luxury")],
          },
          {
            kind: "choice",
            key: "drawings",
            label: t("Do you have drawings?", "کیا آپ کے پاس ڈرائنگ ہے؟", "Kya aap ke paas drawing hai?"),
            options: [opt("yes", "Yes", "جی ہاں", "Ji haan"), opt("no", "No", "نہیں", "Nahi")],
          },
        ],
      },
      {
        key: "c4",
        title: t("Budget and timing", "بجٹ اور وقت", "Budget aur waqt"),
        fields: [
          {
            kind: "choice",
            key: "budget",
            label: t("Approximate budget", "اندازاً بجٹ", "Andazan budget"),
            options: [
              opt("u10l", "Under 10 lakh", "۱۰ لاکھ سے کم", "10 lakh se kam"),
              opt("10-50l", "10 – 50 lakh", "۱۰ سے ۵۰ لاکھ", "10 se 50 lakh"),
              opt("50l-1cr", "50 lakh – 1 crore", "۵۰ لاکھ سے ۱ کروڑ", "50 lakh se 1 crore"),
              opt("1cr+", "Above 1 crore", "۱ کروڑ سے زیادہ", "1 crore se zyada"),
              opt("unsure", "Not sure", "معلوم نہیں", "Pata nahi"),
            ],
          },
          {
            kind: "choice",
            key: "start",
            label: t("When do you want to start?", "کام کب شروع کرنا ہے؟", "Kaam kab shuru karna hai?"),
            options: [
              opt("now", "Immediately", "فوراً", "Foran"),
              opt("1-3m", "In 1–3 months", "۱ سے ۳ ماہ میں", "1 se 3 mahine mein"),
              opt("later", "Later", "بعد میں", "Baad mein"),
            ],
          },
          ...CONTACT_FIELDS,
        ],
      },
    ],
  },
  {
    key: "properties",
    icon: "🏠",
    label: t("Properties: buy, rent, sell", "پراپرٹی: خرید، کرایہ، فروخت", "Property: khareed, kiraya, farokht"),
    intro: t(
      "Buy, rent, sell or invest. Four quick questions and we will show matching options:",
      "خرید، کرایہ، فروخت یا سرمایہ کاری۔ چار مختصر سوالات کے بعد مناسب آپشن دکھائیں گے:",
      "Khareedna, kiraya, bechna ya invest. Chaar sawal ke baad munasib options dikhayenge:",
    ),
    steps: [
      {
        key: "p1",
        title: t("What would you like to do?", "آپ کیا کرنا چاہتے ہیں؟", "Aap kya karna chahte hain?"),
        fields: [
          {
            kind: "choice",
            key: "intent",
            required: true,
            label: t("Choose one", "ایک منتخب کریں", "Aik select karein"),
            options: [
              opt("buy", "Buy a property", "پراپرٹی خریدنا", "Property khareedna"),
              opt("rent", "Rent a property", "کرایہ پر لینا", "Kiraye par lena"),
              opt("sell", "Sell / rent out mine", "اپنی پراپرٹی بیچنا / کرایہ پر دینا", "Apni property bechna / kiraye par dena"),
              opt("invest", "Invest in a development", "ترقیاتی منصوبے میں سرمایہ کاری", "Development mein invest karna"),
            ],
          },
        ],
      },
      {
        key: "p2",
        title: t("Which type?", "کس قسم کی؟", "Kis qism ki?"),
        fields: [
          {
            kind: "choice",
            key: "property_type",
            required: true,
            showIf: { field: "intent", anyOf: ["buy", "rent", "sell"] },
            label: t("Property type", "پراپرٹی کی قسم", "Property ki qism"),
            options: [
              opt("House", "House", "گھر", "Ghar"),
              opt("Apartment", "Apartment", "فلیٹ", "Flat / apartment"),
              opt("Plot", "Plot", "پلاٹ", "Plot"),
              opt("Shop", "Shop", "دکان", "Dukan"),
              opt("Office", "Office", "دفتر", "Office"),
              opt("Plaza", "Plaza", "پلازہ", "Plaza"),
              opt("Farm house", "Farm house", "فارم ہاؤس", "Farm house"),
            ],
          },
          {
            kind: "choice",
            key: "investment_type",
            required: true,
            showIf: { field: "intent", anyOf: ["invest"] },
            label: t("Development type", "منصوبے کی قسم", "Development ki qism"),
            options: [
              opt("plaza", "Commercial plaza", "کمرشل پلازہ", "Commercial plaza"),
              opt("residential", "Residential homes", "رہائشی گھر", "Rehaishi ghar"),
              opt("shops", "Shops", "دکانیں", "Dukanein"),
              opt("market", "Market", "مارکیٹ", "Market"),
              opt("any", "Show all", "سب دکھائیں", "Sab dikhayein"),
            ],
          },
          cityField,
        ],
      },
      {
        key: "p3",
        title: t("Your requirements", "آپ کی ضروریات", "Aap ki zaroriyat"),
        fields: [
          {
            kind: "choice",
            key: "budget_sale",
            showIf: { field: "intent", anyOf: ["buy"] },
            label: t("Budget", "بجٹ", "Budget"),
            options: [
              ...BUDGET_BANDS.sale.map((b) => ({ key: b.key, label: budgetLabel(b.key) })),
              opt("any", "Any budget", "کوئی بھی بجٹ", "Koi bhi budget"),
            ],
          },
          {
            kind: "choice",
            key: "budget_rent",
            showIf: { field: "intent", anyOf: ["rent"] },
            label: t("Monthly rent", "ماہانہ کرایہ", "Mahana kiraya"),
            options: [
              ...BUDGET_BANDS.rent.map((b) => ({ key: b.key, label: budgetLabel(b.key) })),
              opt("any", "Any budget", "کوئی بھی بجٹ", "Koi bhi budget"),
            ],
          },
          {
            kind: "choice",
            key: "size_band",
            showIf: { field: "intent", anyOf: ["buy", "rent"] },
            label: t("Size in Marla", "سائز (مرلہ)", "Size (marla)"),
            options: [
              ...SIZE_BANDS.map((s) => ({ key: s.key, label: sizeLabel(s.key) })),
              opt("any", "Any size", "کوئی بھی سائز", "Koi bhi size"),
            ],
          },
          {
            kind: "text",
            key: "locality",
            max: 120,
            showIf: { field: "intent", anyOf: ["buy", "rent", "sell"] },
            label: t("Locality / area (optional)", "علاقہ (اختیاری)", "Ilaqa (optional)"),
            placeholder: t("e.g. Model Town", "مثلاً ماڈل ٹاؤن", "Maslan Model Town"),
          },
          {
            kind: "choice",
            key: "special",
            multiple: true,
            showIf: { field: "intent", anyOf: ["buy", "rent"] },
            label: t("Any special requirement?", "کوئی خاص ضرورت؟", "Koi khaas zaroorat?"),
            options: [
              opt("corner", "Corner", "کارنر", "Corner"),
              opt("park_facing", "Park facing", "پارک کے سامنے", "Park facing"),
              opt("main_road", "On main road", "مین روڈ پر", "Main road par"),
              opt("furnished", "Furnished", "فرنشڈ", "Furnished"),
            ],
          },
          {
            kind: "text",
            key: "size_text",
            required: true,
            max: 60,
            showIf: { field: "intent", anyOf: ["sell"] },
            label: t("Size of your property", "آپ کی پراپرٹی کا سائز", "Aap ki property ka size"),
            placeholder: t("e.g. 10 Marla", "مثلاً ۱۰ مرلہ", "Maslan 10 marla"),
          },
          {
            kind: "text",
            key: "expected_price",
            max: 60,
            showIf: { field: "intent", anyOf: ["sell"] },
            label: t("Expected price (optional)", "متوقع قیمت (اختیاری)", "Mutawaqqa qeemat (optional)"),
            placeholder: t("e.g. 95 lakh", "مثلاً ۹۵ لاکھ", "Maslan 95 lakh"),
          },
          {
            kind: "choice",
            key: "invest_amount",
            required: true,
            showIf: { field: "intent", anyOf: ["invest"] },
            label: t("Amount you are considering", "سرمایہ کاری کی رقم", "Invest ki raqam"),
            options: [
              opt("u25l", "Up to 25 lakh", "۲۵ لاکھ تک", "25 lakh tak"),
              opt("25l-1cr", "25 lakh – 1 crore", "۲۵ لاکھ سے ۱ کروڑ", "25 lakh se 1 crore"),
              opt("1cr+", "Above 1 crore", "۱ کروڑ سے زیادہ", "1 crore se zyada"),
              opt("unsure", "Not sure yet", "ابھی طے نہیں", "Abhi tay nahi"),
            ],
          },
        ],
      },
      {
        key: "p4",
        title: t("Here is what we found", "یہ آپشن دستیاب ہیں", "Ye options mojood hain"),
        results: "listings",
        fields: [...CONTACT_FIELDS],
      },
    ],
  },
];

function budgetLabel(key: string): T {
  const map: Record<string, T> = {
    u50l: t("Under 50 lakh", "۵۰ لاکھ سے کم", "50 lakh se kam"),
    "50l-1cr": t("50 lakh – 1 crore", "۵۰ لاکھ سے ۱ کروڑ", "50 lakh se 1 crore"),
    "1-3cr": t("1 – 3 crore", "۱ سے ۳ کروڑ", "1 se 3 crore"),
    "3cr+": t("Above 3 crore", "۳ کروڑ سے زیادہ", "3 crore se zyada"),
    u50k: t("Under 50,000", "۵۰ ہزار سے کم", "50 hazar se kam"),
    "50-100k": t("50,000 – 1 lakh", "۵۰ ہزار سے ۱ لاکھ", "50 hazar se 1 lakh"),
    "100k+": t("Above 1 lakh", "۱ لاکھ سے زیادہ", "1 lakh se zyada"),
  };
  return map[key] ?? t(key, key, key);
}

function sizeLabel(key: string): T {
  const map: Record<string, T> = {
    u5: t("Up to 5 Marla", "۵ مرلہ تک", "5 marla tak"),
    "5-10": t("5 – 10 Marla", "۵ سے ۱۰ مرلہ", "5 se 10 marla"),
    "10-20": t("10 Marla – 1 Kanal", "۱۰ مرلہ سے ۱ کنال", "10 marla se 1 kanal"),
    "20+": t("Above 1 Kanal", "۱ کنال سے زیادہ", "1 kanal se zyada"),
  };
  return map[key] ?? t(key, key, key);
}

// ---------------------------------------------------------------------------
// Interface text
// ---------------------------------------------------------------------------

export const UI = {
  title: t("Friends Associates Assistant", "فرینڈز ایسوسی ایٹس اسسٹنٹ", "Friends Associates Assistant"),
  chooseLanguage: t("Choose your language", "اپنی زبان منتخب کریں", "Apni zaban chunein"),
  greeting: t(
    "Assalam-o-Alaikum! Thank you for contacting Friends Associates. How can we help you today?",
    "السلام علیکم! فرینڈز ایسوسی ایٹس سے رابطہ کرنے کا شکریہ۔ ہم آپ کی کیا مدد کر سکتے ہیں؟",
    "Assalam-o-Alaikum! Friends Associates se rabta karne ka shukriya. Hum aap ki kya madad kar sakte hain?",
  ),
  talkToTeam: t("Talk to our team", "ہماری ٹیم سے بات کریں", "Hamari team se baat karein"),
  call: t("Call", "کال کریں", "Call karein"),
  whatsapp: t("WhatsApp", "واٹس ایپ", "WhatsApp"),
  next: t("Next", "آگے", "Aage"),
  back: t("Back", "پیچھے", "Peechay"),
  submit: t("Send my details", "تفصیلات بھیجیں", "Details bhejein"),
  sending: t("Sending…", "بھیجا جا رہا ہے…", "Bheja ja raha hai…"),
  step: t("Question", "سوال", "Sawal"),
  of: t("of", "از", "of"),
  menu: t("Main menu", "مین مینو", "Main menu"),
  restart: t("Start again", "دوبارہ شروع کریں", "Dobara shuru karein"),
  typeHere: t("Type your question…", "اپنا سوال لکھیں…", "Apna sawal likhein…"),
  send: t("Send", "بھیجیں", "Bhejein"),
  required: t("Please answer the required questions.", "براہ کرم ضروری سوالات کے جواب دیں۔", "Meharbani kar ke zaroori sawal mukammal karein."),
  phoneInvalid: t("Please enter a valid phone number.", "براہ کرم درست فون نمبر لکھیں۔", "Meharbani kar ke sahi phone number likhein."),
  thanks: t(
    "Thank you! Our team will contact you shortly. You can send documents, photos or drawings on WhatsApp.",
    "شکریہ! ہماری ٹیم جلد آپ سے رابطہ کرے گی۔ کاغذات، تصاویر یا ڈرائنگ واٹس ایپ پر بھیج سکتے ہیں۔",
    "Shukriya! Hamari team jald aap se rabta karegi. Kaghzaat, tasaveer ya drawings WhatsApp par bhej sakte hain.",
  ),
  failed: t(
    "Sorry, we could not send that. Please try again or contact us on WhatsApp.",
    "معذرت، بھیجا نہیں جا سکا۔ دوبارہ کوشش کریں یا واٹس ایپ پر رابطہ کریں۔",
    "Maazrat, bheja nahi ja saka. Dobara koshish karein ya WhatsApp par rabta karein.",
  ),
  noResults: t(
    "No exact match right now — share your details and we will find options for you.",
    "ابھی کوئی مکمل مطابقت نہیں — اپنی تفصیلات دیں، ہم آپ کے لیے آپشن تلاش کریں گے۔",
    "Abhi koi bilkul match nahi — apni details dein, hum aap ke liye options dhoondhenge.",
  ),
  perMonth: t("/ month", "/ ماہانہ", "/ mahana"),
  from: t("from", "کم از کم", "kam az kam"),
  fallback: t(
    "Please tell us in simple words what you want to build or do, where, and the approximate size. For example: “5 Marla house plan and construction estimate” or “2 Kanal flour mill in Rahim Yar Khan”.",
    "براہ کرم آسان الفاظ میں بتائیں کہ آپ کیا بنوانا یا کروانا چاہتے ہیں، کہاں اور تقریباً کتنا سائز۔ مثلاً: ”۵ مرلہ گھر کا نقشہ اور تعمیر کا تخمینہ“۔",
    "Meharbani kar ke asaan alfaaz mein batayein aap kya banwana ya karwana chahte hain, kahan aur andazan size. Maslan: “5 marla ghar ka naqsha aur construction estimate chahiye”.",
  ),
  detected: t("Sure — let's start with a few questions.", "ضرور — چند سوالات سے شروع کرتے ہیں۔", "Bilkul — chand sawal se shuru karte hain."),
  myAccount: t("My account", "میرا اکاؤنٹ", "Mera account"),
} as const;

// ---------------------------------------------------------------------------
// Rules shared by browser and server
// ---------------------------------------------------------------------------

export function getFlow(key: string): Flow | undefined {
  return FLOWS.find((f) => f.key === key);
}

export function isVisible(field: Field, answers: Answers): boolean {
  if (!field.showIf) return true;
  const v = answers[field.showIf.field];
  const values = Array.isArray(v) ? v : v ? [v] : [];
  return values.some((x) => field.showIf!.anyOf.includes(x));
}

/** Validates one card. Returns the first problem ("required" | "phone"), or null when the card is complete. */
export function stepProblem(step: Step, answers: Answers): "required" | "phone" | null {
  return firstProblem(step, answers)?.problem ?? null;
}

/** Like stepProblem, but also says which field is wrong, so the chat can point the visitor to it. */
export function firstProblem(step: Step, answers: Answers): { problem: "required" | "phone"; field: Field } | null {
  for (const f of step.fields) {
    if (!isVisible(f, answers)) continue;
    const v = answers[f.key];
    const empty = v === undefined || (Array.isArray(v) ? v.length === 0 : v.trim() === "");
    if (f.required && empty) return { problem: "required", field: f };
    if (f.kind === "text" && f.key === "phone" && !empty && !PHONE_RE.test(String(v).trim())) return { problem: "phone", field: f };
  }
  return null;
}

/**
 * Server-side cleaning: keeps only known fields that are visible for these answers, only allowed option keys,
 * and trims text to its maximum length. Anything else a client sends is dropped.
 */
export function sanitizeAnswers(flow: Flow, raw: unknown): Answers | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const clean: Answers = {};
  for (const step of flow.steps) {
    for (const f of step.fields) {
      const v = input[f.key];
      if (v === undefined) continue;
      if (f.kind === "choice") {
        const allowed = new Set(f.options.map((o) => o.key));
        if (f.multiple) {
          if (!Array.isArray(v)) continue;
          const picked = [...new Set(v.filter((x): x is string => typeof x === "string" && allowed.has(x)))];
          if (picked.length) clean[f.key] = picked;
        } else if (typeof v === "string" && allowed.has(v)) {
          clean[f.key] = v;
        }
      } else if (typeof v === "string") {
        const s = v.trim().slice(0, f.max);
        if (s) clean[f.key] = s;
      }
    }
  }
  // Drop answers to fields that are hidden for this combination (e.g. rent budget when intent is "sell").
  for (const step of flow.steps) for (const f of step.fields) if (!isVisible(f, clean)) delete clean[f.key];
  for (const step of flow.steps) if (stepProblem(step, clean)) return null;
  return clean;
}

/** English label for an answer, for the lead record staff read. */
export function answerLabel(flow: Flow, key: string, value: string | string[], lang: Lang = "en"): string {
  const field = flow.steps.flatMap((s) => s.fields).find((f) => f.key === key);
  if (!field) return Array.isArray(value) ? value.join(", ") : value;
  const one = (v: string) => (field.kind === "choice" ? field.options.find((o) => o.key === v)?.label[lang] ?? v : v);
  return Array.isArray(value) ? value.map(one).join(", ") : one(value);
}

export function fieldLabel(flow: Flow, key: string, lang: Lang = "en"): string {
  return flow.steps.flatMap((s) => s.fields).find((f) => f.key === key)?.label[lang] ?? key;
}
