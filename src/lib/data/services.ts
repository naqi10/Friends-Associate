import { cache } from "react";
import { prisma } from "../db";
import type { Division } from "../catalog";
import { splitLines } from "./site";

export type ServiceRow = {
  id: string;
  division: Division;
  name: string;
  icon: string;
  shortDescription: string;
  features: string[];
  startingPrice: string;
  estimatedDuration: string;
  imagePath: string;
  ctaText: string;
  ctaUrl: string;
  sortOrder: number;
  published: boolean;
};

type DbService = Awaited<ReturnType<typeof prisma.service.findFirstOrThrow>>;

function mapService(s: DbService): ServiceRow {
  return { ...s, division: s.division as Division, features: splitLines(s.features) };
}

/** Published services for the public pages, in display order. */
export const getPublishedServices = cache(async (division?: Division): Promise<ServiceRow[]> => {
  const rows = await prisma.service.findMany({
    where: { published: true, ...(division ? { division } : {}) },
    orderBy: [{ division: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(mapService);
});

/** Every service, published or not, for Admin → Services. */
export async function getAllServices(): Promise<ServiceRow[]> {
  const rows = await prisma.service.findMany({ orderBy: [{ division: "asc" }, { sortOrder: "asc" }, { name: "asc" }] });
  return rows.map(mapService);
}

export async function getService(id: string) {
  const row = await prisma.service.findUnique({ where: { id } });
  return row ? mapService(row) : null;
}

export type ServiceInput = Omit<ServiceRow, "id" | "features" | "imagePath"> & { features: string[]; imagePath?: string };

export async function saveService(id: string | null, input: ServiceInput) {
  const data = { ...input, features: input.features.join("\n") };
  const row = id ? await prisma.service.update({ where: { id }, data }) : await prisma.service.create({ data });
  return mapService(row);
}

export async function deleteService(id: string) {
  return prisma.service.delete({ where: { id } });
}
