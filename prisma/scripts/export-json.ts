/**
 * Dumps every table to JSON (one file) so data can be moved between database engines.
 * Usage: npx tsx prisma/scripts/export-json.ts <out.json>
 */
import fs from "fs";
import { PrismaClient } from "@prisma/client";

export const MODELS = [
  "company", "siteSettings", "office", "managementMember", "contentBlock", "rolePermission",
  "user", "session", "project", "projectStage", "projectListItem", "property",
  "investmentOpportunity", "booking", "document", "news", "lead", "inquiry", "auditLog",
] as const;

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("Usage: export-json.ts <out.json>");
  const prisma = new PrismaClient();
  const dump: Record<string, unknown[]> = {};
  for (const m of MODELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dump[m] = await (prisma as any)[m].findMany();
    console.log(`${m}: ${dump[m].length}`);
  }
  fs.writeFileSync(out, JSON.stringify(dump, null, 1));
  await prisma.$disconnect();
}

if (process.argv[1]?.includes("export-json")) main().catch((e) => { console.error(e); process.exit(1); });
