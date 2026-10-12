/**
 * Idempotent content migration for the 07-10-2026 restructure (Friends Associates brand, divisions,
 * categories, stages, Buy/Rent listings, investment opportunities, unified leads).
 * Safe to run repeatedly on a live database: it only upserts known sample rows and normalises fields.
 * Used by prisma/seed.ts and by `npm run db:migrate-content`.
 */
import type { PrismaClient } from "@prisma/client";
import { parseMarla } from "../src/lib/catalog";
import fs from "fs";
import path from "path";
import { HERO_DEFAULTS, HERO_MEDIA_DEFAULTS } from "../src/lib/content-defaults";

const LEGACY_LEAD_STATUS: Record<string, string> = {
  New: "new",
  "Follow-up": "follow_up",
  Qualified: "requirement_received",
  Closed: "closed",
};

type SampleProject = {
  id: string;
  slug: string;
  name: string;
  division: "architecture" | "construction";
  category: string;
  location: string;
  description: string;
  status: string;
  expectedCompletion: string;
  progressPercent: number;
  featured?: boolean;
  stages: [name: string, percent: number, targetDate?: string, note?: string][];
};

const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: "d4000001-0001-4000-8000-000000000001",
    slug: "petrol-pump-khanpur-road",
    name: "Petrol Pump, Khanpur Road",
    division: "architecture",
    category: "commercial",
    location: "Khanpur Road",
    description: "Site planning, architectural drawings and NOC/approval consultancy for a highway petrol pump with tuck shop and service bay. Sample project — replace with client content.",
    status: "Approvals in progress",
    expectedCompletion: "Q1 2027",
    progressPercent: 70,
    featured: true,
    stages: [["Site survey & KML", 100], ["Design completed", 100], ["NOC applications filed", 60], ["Construction drawings", 20]],
  },
  {
    id: "d4000002-0002-4000-8000-000000000002",
    slug: "flour-mill-industrial-estate",
    name: "Flour Mill, Industrial Estate",
    division: "construction",
    category: "industrial",
    location: "Industrial Estate",
    description: "Turnkey construction of a 100-ton/day flour mill: production hall, wheat storage, office block and loading yard. Sample project.",
    status: "Under construction",
    expectedCompletion: "Q2 2027",
    progressPercent: 55,
    featured: true,
    stages: [
      ["Design completed", 100],
      ["Grey structure", 100],
      ["Building layout laid", 50],
      ["Machinery foundations", 20, "2026-11-20", "Construction continuing until 20 Nov 2026"],
    ],
  },
  {
    id: "d4000003-0003-4000-8000-000000000003",
    slug: "lpg-plant-liaquatpur",
    name: "LPG Plant, Liaquatpur",
    division: "architecture",
    category: "consultancy",
    location: "Liaquatpur",
    description: "Project planning, safety-distance site layout and NOC consultancy for an LPG storage and filling plant. Sample project.",
    status: "Planning",
    expectedCompletion: "Q3 2027",
    progressPercent: 30,
    stages: [["Land documents reviewed", 100], ["Site layout", 60], ["NOC applications", 10]],
  },
  {
    id: "d4000004-0004-4000-8000-000000000004",
    slug: "city-care-clinic",
    name: "City Care Clinic",
    division: "architecture",
    category: "healthcare",
    location: "Shahi Road",
    description: "Architectural and structural drawings for a three-storey private clinic with OPD, labs and day-care wards. Sample project.",
    status: "Design",
    expectedCompletion: "Q4 2026",
    progressPercent: 80,
    stages: [["2D floor plans", 100], ["3D elevation", 100], ["Structural drawings", 60]],
  },
  {
    id: "d4000005-0005-4000-8000-000000000005",
    slug: "school-campus-model-town",
    name: "School Campus, Model Town",
    division: "construction",
    category: "educational",
    location: "Model Town",
    description: "Construction of a two-storey school block with 16 classrooms, labs and a library. Sample project.",
    status: "Under construction",
    expectedCompletion: "Q2 2027",
    progressPercent: 45,
    featured: true,
    stages: [["Design completed", 100], ["Grey structure", 70], ["Electrical & plumbing", 15]],
  },
  {
    id: "d4000006-0006-4000-8000-000000000006",
    slug: "canal-view-restaurant",
    name: "Canal View Restaurant",
    division: "architecture",
    category: "hospitality",
    location: "Canal Road",
    description: "Concept design, interiors and working drawings for a 120-seat family restaurant. Sample project.",
    status: "Completed",
    expectedCompletion: "Completed 2026",
    progressPercent: 100,
    stages: [["Concept design", 100], ["Interior design", 100], ["Working drawings", 100]],
  },
  {
    id: "d4000007-0007-4000-8000-000000000007",
    slug: "family-park-renovation",
    name: "Family Park Renovation",
    division: "construction",
    category: "recreational",
    location: "Abbasia Town",
    description: "Walking tracks, play area, fountains and landscape renovation of a public family park. Sample project.",
    status: "Finishing",
    expectedCompletion: "Q4 2026",
    progressPercent: 85,
    stages: [["Design completed", 100], ["Civil works", 100], ["Landscaping", 60]],
  },
];

/** Stages for the original three developments, derived from their overall progress. */
const EXISTING_PROJECT_SETUP: Record<string, { division: string; category: string; stages: [string, number][] }> = {
  "faryk-residences-lahore": { division: "construction", category: "residential", stages: [["Design completed", 100], ["Building layout laid", 100], ["Grey structure", 75], ["Finishing", 20]] },
  "faryk-harbour-karachi": { division: "construction", category: "commercial", stages: [["Design completed", 100], ["Grey structure", 100], ["Finishing", 60]] },
  "faryk-canal-estate-ryk": { division: "construction", category: "residential", stages: [["Design completed", 100], ["Building layout laid", 50], ["Excavation & foundation", 20]] },
};

const SAMPLE_LISTINGS = [
  { id: "e5000001-0001-4000-8000-000000000001", listingType: "rent", title: "5 Marla House, Model Town", type: "House", city: "Rahim Yar Khan", locality: "Model Town", size: "5 Marla", pricePkr: 45_000, description: "3 bed, 2 bath, car porch. Sample listing." },
  { id: "e5000002-0002-4000-8000-000000000002", listingType: "rent", title: "Shop on Shahi Road", type: "Shop", city: "Rahim Yar Khan", locality: "Shahi Road", size: "300 sq ft", pricePkr: 60_000, description: "Main-road shop with shutter and washroom. Sample listing." },
  { id: "e5000003-0003-4000-8000-000000000003", listingType: "rent", title: "2 Bed Apartment, Gulberg", type: "Apartment", city: "Lahore", locality: "Gulberg III", size: "1,100 sq ft", pricePkr: 120_000, description: "Furnished, lift and backup power. Sample listing." },
  { id: "e5000004-0004-4000-8000-000000000004", listingType: "sale", title: "10 Marla Plot, Sheikh Zayed Colony", type: "Plot", city: "Rahim Yar Khan", locality: "Sheikh Zayed Colony", size: "10 Marla", pricePkr: 9_500_000, description: "Corner plot near park. Sample listing." },
  { id: "e5000005-0005-4000-8000-000000000005", listingType: "sale", title: "1 Kanal House, Abbasia Town", type: "House", city: "Rahim Yar Khan", locality: "Abbasia Town", size: "1 Kanal", pricePkr: 32_000_000, description: "5 bed double-storey house. Sample listing." },
] as const;

const SAMPLE_INVESTMENTS = [
  {
    id: "f6000001-0001-4000-8000-000000000001",
    slug: "shahi-road-commercial-plaza",
    title: "Shahi Road Commercial Plaza",
    investmentType: "plaza",
    city: "Rahim Yar Khan",
    location: "Shahi Road",
    summary: "Ground + 4 commercial plaza with 48 shops and 12 offices on a main road.",
    description: "Investors fund the construction of the plaza and share in the sale or rental of units according to a written agreement. Sample opportunity — figures to be confirmed by Friends Associates.",
    minimumInvestmentPkr: 1_000_000,
    targetAmountPkr: 60_000_000,
    expectedDuration: "24–30 months",
    paymentStructure: "Instalments linked to construction stages",
    returnsNote: "Profit share from sale/rent of units as set out in the investment agreement. Returns are not guaranteed.",
    sortOrder: 1,
  },
  {
    id: "f6000002-0002-4000-8000-000000000002",
    slug: "canal-estate-residential-homes",
    title: "Canal Estate Residential Homes",
    investmentType: "residential",
    city: "Rahim Yar Khan",
    location: "Canal Road",
    summary: "Development of 20 ready-to-live 5 and 10 Marla homes.",
    description: "Capital is used to build homes that are sold on completion. Sample opportunity.",
    minimumInvestmentPkr: 2_500_000,
    targetAmountPkr: 80_000_000,
    expectedDuration: "18–24 months",
    paymentStructure: "50% on signing, 50% at grey structure",
    returnsNote: "Share of net sale proceeds per agreement. Returns depend on market prices and are not guaranteed.",
    sortOrder: 2,
    projectSlug: "faryk-canal-estate-ryk",
  },
  {
    id: "f6000003-0003-4000-8000-000000000003",
    slug: "model-town-shops-block",
    title: "Model Town Shops Block",
    investmentType: "shops",
    city: "Rahim Yar Khan",
    location: "Model Town",
    summary: "Row of 10 neighbourhood shops for long-term rental income.",
    description: "Investors co-own shops and receive rental income through a managed lease. Sample opportunity.",
    minimumInvestmentPkr: 1_500_000,
    targetAmountPkr: 25_000_000,
    expectedDuration: "12 months to completion",
    paymentStructure: "Lump sum or 3 instalments",
    returnsNote: "Rental income share after maintenance costs, per agreement. Not guaranteed.",
    sortOrder: 3,
  },
  {
    id: "f6000004-0004-4000-8000-000000000004",
    slug: "grain-market-development",
    title: "Grain Market Development",
    investmentType: "market",
    city: "Rahim Yar Khan",
    location: "Grain Market Road",
    summary: "Covered market with 30 stalls, storage and parking.",
    description: "Early-stage opportunity; land secured, approvals in progress. Sample opportunity.",
    minimumInvestmentPkr: 5_000_000,
    targetAmountPkr: 120_000_000,
    expectedDuration: "30–36 months",
    paymentStructure: "Milestone-based",
    returnsNote: "Profit share per agreement once approvals are complete. Not guaranteed.",
    sortOrder: 4,
  },
];

export async function applyRestructure(prisma: PrismaClient, log: (m: string) => void = () => {}) {
  // 1. Brand
  await prisma.company.updateMany({
    where: { id: 1 },
    data: { name: "Friends Associates", website: "faryk.com", whatsapp: "+92 312 6711828", tagline: "Architecture · Construction · Properties" },
  });
  await prisma.office.updateMany({ where: { city: "Rahim Yar Khan" }, data: { phone: "0312-6711828", sortOrder: 0 } });
  // Refresh the hero only where it still holds the original launch copy, so admin edits are never overwritten.
  const hero = await prisma.contentBlock.findUnique({ where: { key: "home.hero" } });
  if (hero) {
    const data: Record<string, string> = {};
    if (hero.subtitle === "Architecture · Construction · Real Estate") data.subtitle = HERO_DEFAULTS.subtitle;
    if (/across Lahore, Karachi and Rahim Yar Khan/.test(hero.description) && /^(FARYK|Friends Associates) designs, builds/.test(hero.description)) {
      data.description = HERO_DEFAULTS.description;
    }
    if (hero.secondaryButtonUrl === "/properties?status=Available") data.secondaryButtonUrl = HERO_DEFAULTS.secondaryButtonUrl;
    // New hero photo (10 Oct 2026) replaces the original default image, unless an admin chose another.
    if (hero.imagePath === "/images/hero.jpg") data.imagePath = HERO_DEFAULTS.imagePath;
    // Black & white design: the original headline gains its grey italic part.
    if (hero.title === "Building landmarks, from ideas to execution") data.title = HERO_DEFAULTS.title;
    if (Object.keys(data).length) await prisma.contentBlock.update({ where: { key: "home.hero" }, data });
  }
  // Sample developments were named "FARYK …"; under the Friends Associates brand they become "Friends …".
  // Slugs (URLs) are kept so existing links keep working.
  const rebrand = (v: string | null) => (v ? v.replace(/FARYK/g, "Friends") : v);
  for (const p of await prisma.project.findMany({ select: { id: true, name: true, description: true, seoTitle: true, seoDescription: true } })) {
    if ([p.name, p.description, p.seoTitle, p.seoDescription].some((v) => v?.includes("FARYK"))) {
      await prisma.project.update({
        where: { id: p.id },
        data: { name: rebrand(p.name)!, description: rebrand(p.description)!, seoTitle: rebrand(p.seoTitle), seoDescription: rebrand(p.seoDescription) },
      });
    }
  }
  for (const n of await prisma.news.findMany({ select: { id: true, title: true, excerpt: true, body: true, seoTitle: true, seoDescription: true } })) {
    if ([n.title, n.excerpt, n.body, n.seoTitle, n.seoDescription].some((v) => v?.includes("FARYK"))) {
      await prisma.news.update({
        where: { id: n.id },
        data: { title: rebrand(n.title)!, excerpt: rebrand(n.excerpt)!, body: rebrand(n.body)!, seoTitle: rebrand(n.seoTitle), seoDescription: rebrand(n.seoDescription) },
      });
    }
  }
  // Second hero photo + alt texts: create once, never overwrite admin edits.
  const media = await prisma.contentBlock.findUnique({ where: { key: HERO_MEDIA_DEFAULTS.key } });
  if (!media) await prisma.contentBlock.create({ data: { ...HERO_MEDIA_DEFAULTS } });

  // Seed rows pointed at /images/projects/… and /images/properties/… files that never existed. Clear any
  // static image path whose file is missing so the site shows a placeholder instead of a broken image.
  const missing = (p: string) => p.startsWith("/images/") && !fs.existsSync(path.join(process.cwd(), "public", p));
  for (const p of await prisma.project.findMany({ select: { id: true, imagePath: true } })) {
    if (missing(p.imagePath)) await prisma.project.update({ where: { id: p.id }, data: { imagePath: "" } });
  }
  for (const p of await prisma.property.findMany({ select: { id: true, imagePath: true } })) {
    if (missing(p.imagePath)) await prisma.property.update({ where: { id: p.id }, data: { imagePath: "" } });
  }
  log("brand updated");

  // 2. Existing projects: division, category, stages (only if they have none yet)
  for (const [slug, setup] of Object.entries(EXISTING_PROJECT_SETUP)) {
    const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, _count: { select: { stages: true } } } });
    if (!project) continue;
    await prisma.project.update({ where: { id: project.id }, data: { division: setup.division, category: setup.category, developer: "Friends Associates" } });
    if (project._count.stages === 0) {
      await prisma.projectStage.createMany({
        data: setup.stages.map(([name, percent], i) => ({ projectId: project.id, name, percent, sortOrder: i })),
      });
    }
  }

  // 3. Sample projects across categories
  for (const p of SAMPLE_PROJECTS) {
    const { stages, featured, ...rest } = p;
    const data = {
      ...rest,
      featured: featured ?? false,
      city: "Rahim Yar Khan",
      developer: "Friends Associates",
      contactPerson: "Friends Associates",
      contactPhone: "0312-6711828",
      type: p.category === "residential" ? "Residential" : "Commercial",
      imagePath: "",
      masterPlan: "",
      sitePlan: "",
      pricingLabel: "",
      paymentPlan: "",
      availableUnits: 0,
    };
    const existing = await prisma.project.findUnique({ where: { id: p.id }, select: { id: true } });
    if (!existing) {
      await prisma.project.create({ data });
      await prisma.projectStage.createMany({
        data: stages.map(([name, percent, targetDate, note], i) => ({ projectId: p.id, name, percent, targetDate: targetDate ?? null, note: note ?? "", sortOrder: i })),
      });
    }
  }
  // Overall progress = average of stages (the rule the PM screens use), for every project with stages.
  const averages = await prisma.projectStage.groupBy({ by: ["projectId"], _avg: { percent: true } });
  for (const a of averages) {
    await prisma.project.update({ where: { id: a.projectId }, data: { progressPercent: Math.round(a._avg.percent ?? 0) } });
  }
  log(`projects: ${await prisma.project.count()}`);

  // 4. Listings: existing project units become sale listings with locality and Marla size
  const units = await prisma.property.findMany({ include: { project: { select: { location: true } } } });
  for (const u of units) {
    await prisma.property.update({
      where: { id: u.id },
      data: {
        locality: u.locality || u.project?.location || "",
        areaMarla: u.areaMarla ?? parseMarla(u.size),
      },
    });
  }
  for (const l of SAMPLE_LISTINGS) {
    await prisma.property.upsert({
      where: { id: l.id },
      update: {},
      create: { ...l, status: "Available", imagePath: "", areaMarla: parseMarla(l.size), projectId: null },
    });
  }
  log(`listings: ${await prisma.property.count()}`);

  // 5. Investment opportunities
  for (const inv of SAMPLE_INVESTMENTS) {
    const { projectSlug, ...rest } = inv as typeof inv & { projectSlug?: string };
    const projectId = projectSlug ? (await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } }))?.id ?? null : null;
    await prisma.investmentOpportunity.upsert({ where: { id: inv.id }, update: {}, create: { ...rest, projectId } });
  }
  log(`investments: ${await prisma.investmentOpportunity.count()}`);

  // 6. Leads: legacy statuses → pipeline keys; legacy contact inquiries → leads (once)
  for (const [from, to] of Object.entries(LEGACY_LEAD_STATUS)) {
    await prisma.lead.updateMany({ where: { status: from }, data: { status: to } });
  }
  const inquiries = await prisma.inquiry.findMany();
  for (const i of inquiries) {
    const marker = JSON.stringify({ inquiryId: i.id });
    const already = await prisma.lead.findFirst({ where: { details: marker }, select: { id: true } });
    if (!already) {
      await prisma.lead.create({
        data: { name: i.name, phone: i.phone, email: i.email, city: "", interest: "Website enquiry", message: i.message, status: "new", source: "contact", details: marker, createdAt: i.createdAt },
      });
    }
  }
  log(`leads: ${await prisma.lead.count()}`);
}
