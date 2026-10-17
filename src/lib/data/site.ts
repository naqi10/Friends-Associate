import { randomUUID } from "crypto";
import { cache } from "react";
import { prisma } from "../db";
import { ABOUT_LISTS, FAQ_PREFIX, PAGE_CONTENT, type AboutListKey, type PageContentKey } from "../content-defaults";

/* ---------- Page headings ---------- */

export type PageContent = { key: PageContentKey; title: string; intro: string };

/** Heading and intro for one public page; the original wording until the admin saves a change. */
export const getPageContent = cache(async (key: PageContentKey): Promise<PageContent> => {
  const all = await getAllPageContent();
  return all.find((p) => p.key === key)!;
});

/** One query for every page heading (used by each page via getPageContent, and by the admin screen). */
export const getAllPageContent = cache(async (): Promise<PageContent[]> => {
  const keys = Object.keys(PAGE_CONTENT) as PageContentKey[];
  const rows = await prisma.contentBlock.findMany({ where: { key: { in: keys } } });
  const by = new Map(rows.map((r) => [r.key, r]));
  return keys.map((key) => {
    const row = by.get(key);
    const def = PAGE_CONTENT[key];
    return { key, title: row?.title.trim() || def.title, intro: row ? row.description : def.intro };
  });
});

export async function savePageContent(key: PageContentKey, title: string, intro: string) {
  const data = { title, description: intro, subtitle: PAGE_CONTENT[key].label };
  return prisma.contentBlock.upsert({ where: { key }, create: { key, ...data }, update: data });
}

/* ---------- About page lists ---------- */

export type AboutList = { key: AboutListKey; title: string; items: string[] };

export const getAboutLists = cache(async (): Promise<AboutList[]> => {
  const keys = Object.keys(ABOUT_LISTS) as AboutListKey[];
  const rows = await prisma.contentBlock.findMany({ where: { key: { in: keys } } });
  const by = new Map(rows.map((r) => [r.key, r]));
  return keys.map((key) => {
    const row = by.get(key);
    const def = ABOUT_LISTS[key];
    return {
      key,
      title: row?.title.trim() || def.title,
      items: row ? splitLines(row.description) : [...def.items],
    };
  });
});

export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-*✓]+/, "").trim())
    .filter(Boolean);
}

export async function saveAboutList(key: AboutListKey, title: string, items: string[]) {
  const data = { title, description: items.join("\n") };
  return prisma.contentBlock.upsert({ where: { key }, create: { key, ...data }, update: data });
}

/* ---------- FAQs ---------- */

export type Faq = { id: string; question: string; answer: string; sortOrder: number; active: boolean };

function toFaq(r: { key: string; title: string; description: string; sortOrder: number; active: boolean }): Faq {
  return { id: r.key.slice(FAQ_PREFIX.length), question: r.title, answer: r.description, sortOrder: r.sortOrder, active: r.active };
}

export const getFaqs = cache(async ({ includeHidden = false } = {}): Promise<Faq[]> => {
  const rows = await prisma.contentBlock.findMany({
    where: { key: { startsWith: FAQ_PREFIX }, ...(includeHidden ? {} : { active: true }) },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "asc" }],
  });
  return rows.map(toFaq);
});

export async function getFaq(id: string) {
  const row = await prisma.contentBlock.findUnique({ where: { key: FAQ_PREFIX + id } });
  return row ? toFaq(row) : null;
}

export async function saveFaq(input: Omit<Faq, "id"> & { id?: string }) {
  const id = input.id || randomUUID();
  const data = { title: input.question, description: input.answer, sortOrder: input.sortOrder, active: input.active, subtitle: "FAQ" };
  const row = await prisma.contentBlock.upsert({ where: { key: FAQ_PREFIX + id }, create: { key: FAQ_PREFIX + id, ...data }, update: data });
  return toFaq(row);
}

export async function deleteFaq(id: string) {
  return prisma.contentBlock.delete({ where: { key: FAQ_PREFIX + id } });
}

/* ---------- Company details, offices, team ---------- */

export type CompanyTextInput = {
  tagline: string;
  email: string;
  whatsapp: string;
  experience: string;
  mission: string;
  vision: string;
};

export async function updateCompanyText(input: Partial<CompanyTextInput>) {
  const before = await prisma.company.findUniqueOrThrow({ where: { id: 1 } });
  const after = await prisma.company.update({ where: { id: 1 }, data: input });
  return { before, after };
}

export async function updateOffice(id: string, input: { address: string; phone: string; sortOrder: number }) {
  const before = await prisma.office.findUnique({ where: { id } });
  if (!before) return null;
  const after = await prisma.office.update({ where: { id }, data: input });
  return { before, after };
}

export type TeamMemberInput = {
  name: string;
  title: string;
  bio: string;
  experience: string;
  sortOrder: number;
  active: boolean;
  photoPath?: string;
};

export async function getTeamMember(id: string) {
  return prisma.managementMember.findUnique({ where: { id } });
}

export async function saveTeamMember(id: string | null, input: TeamMemberInput) {
  if (id) return prisma.managementMember.update({ where: { id }, data: input });
  return prisma.managementMember.create({ data: { ...input, photoPath: input.photoPath ?? "" } });
}

export async function deleteTeamMember(id: string) {
  return prisma.managementMember.delete({ where: { id } });
}
