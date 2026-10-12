/**
 * Loads a JSON dump made by export-json.ts into an EMPTY database (any engine), in dependency order.
 * Usage: npx tsx prisma/scripts/import-json.ts <in.json>
 */
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { MODELS } from "./export-json";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: import-json.ts <in.json>");
  const dump = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Record<string, unknown>[]>;
  const prisma = new PrismaClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const existing = await prisma.user.count();
  if (existing > 0) throw new Error("Target database is not empty; refusing to import over existing data.");

  await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = tx as any;
    for (const m of MODELS) {
      const rows = dump[m] ?? [];
      if (rows.length) await t[m].createMany({ data: rows });
    }
  });

  let ok = true;
  for (const m of MODELS) {
    const expected = (dump[m] ?? []).length;
    const actual = await db[m].count();
    if (expected !== actual) ok = false;
    console.log(`${expected === actual ? "✓" : "✗"} ${m}: ${actual}/${expected}`);
  }
  await prisma.$disconnect();
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
