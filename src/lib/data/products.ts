import { cache } from "react";
import { prisma } from "../db";
import type { ProductCategory } from "../catalog";
import { slugify } from "../property-slug";
import { splitLines } from "./site";

/** One way the product is sold: "9 inch · Rs 3,800 per roll". `label` is empty for a single price. */
export type ProductOption = { label: string; pricePkr: number; unit: string };

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  brand: string;
  summary: string;
  options: ProductOption[];
  pricePkr: number | null;
  benefits: string[];
  specs: string[];
  note: string;
  imagePath: string;
  published: boolean;
  sortOrder: number;
};

type DbProduct = Awaited<ReturnType<typeof prisma.product.findFirstOrThrow>>;

/** "9 inch | 3800 | per roll" lines → options. Lines without a valid price are skipped. */
export function parseOptions(text: string): ProductOption[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split("|").map((p) => p.trim()))
    .filter((p) => p.length >= 2)
    .map(([label, price, unit = ""]) => ({ label, pricePkr: Number(price.replace(/[^\d]/g, "")), unit }))
    .filter((o) => Number.isInteger(o.pricePkr) && o.pricePkr > 0);
}

export function formatOptions(options: ProductOption[]) {
  return options.map((o) => [o.label, String(o.pricePkr), o.unit].join(" | ")).join("\n");
}

function mapProduct(p: DbProduct): ProductRow {
  return {
    ...p,
    category: p.category as ProductCategory,
    options: parseOptions(p.options),
    benefits: splitLines(p.benefits),
    specs: splitLines(p.specs),
  };
}

const ORDER = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

/** Published products for the website, in display order. */
export const getPublishedProducts = cache(async (category?: ProductCategory): Promise<ProductRow[]> => {
  const rows = await prisma.product.findMany({ where: { published: true, ...(category ? { category } : {}) }, orderBy: ORDER });
  return rows.map(mapProduct);
});

export const getPublishedProduct = cache(async (slug: string) => {
  const row = await prisma.product.findFirst({ where: { slug, published: true } });
  return row ? mapProduct(row) : null;
});

/** Every product, shown or hidden, for Admin → Products. */
export async function getAllProducts(): Promise<ProductRow[]> {
  return (await prisma.product.findMany({ orderBy: ORDER })).map(mapProduct);
}

export async function getProduct(id: string) {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? mapProduct(row) : null;
}

export type ProductInput = Omit<ProductRow, "id" | "slug" | "imagePath" | "pricePkr"> & { imagePath?: string };

/** A slug from the name, made unique with -2, -3 … */
async function uniqueSlug(name: string) {
  const base = slugify(name) || "product";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await prisma.product.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}

export async function saveProduct(id: string | null, input: ProductInput) {
  const data = {
    ...input,
    options: formatOptions(input.options),
    pricePkr: input.options.length ? Math.min(...input.options.map((o) => o.pricePkr)) : null,
    benefits: input.benefits.join("\n"),
    specs: input.specs.join("\n"),
  };
  // The address is set once, so links shared on WhatsApp keep working after a rename.
  const row = id ? await prisma.product.update({ where: { id }, data }) : await prisma.product.create({ data: { ...data, slug: await uniqueSlug(input.name) } });
  return mapProduct(row);
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}
