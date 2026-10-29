import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { propertyPath } from "@/lib/property-slug";

// Rebuilt at most hourly so new projects, units and news appear without a deploy.
export const revalidate = 3600;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/projects", priority: 0.9, changeFrequency: "weekly" },
  { path: "/properties", priority: 0.9, changeFrequency: "daily" },
  { path: "/products", priority: 0.8, changeFrequency: "weekly" },
  { path: "/progress", priority: 0.7, changeFrequency: "weekly" },
  { path: "/architecture", priority: 0.9, changeFrequency: "weekly" },
  { path: "/construction", priority: 0.9, changeFrequency: "weekly" },
  { path: "/investment", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/news", priority: 0.6, changeFrequency: "weekly" },
  { path: "/documents", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = STATIC_PATHS.map((p) => ({ url: absoluteUrl(p.path), changeFrequency: p.changeFrequency, priority: p.priority }));
  let rows;
  try {
    rows = await Promise.all([
      prisma.project.findMany({ where: { published: true }, select: { slug: true } }),
      prisma.property.findMany({ where: { published: true, archivedAt: null }, select: { id: true, slug: true } }),
      prisma.news.findMany({ select: { slug: true, publishedOn: true } }),
      prisma.investmentOpportunity.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
      prisma.product.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    ]);
  } catch (e) {
    // Never fail a build or deploy because the database is briefly unreachable: serve the static pages
    // now; the hourly revalidation fills in projects, listings and news once the database answers.
    console.error("sitemap: database unavailable, serving static entries only", e instanceof Error ? e.message : e);
    return staticEntries;
  }
  const [projects, properties, news, investments, products] = rows;

  return [
    ...staticEntries,
    ...projects.map((p) => ({ url: absoluteUrl(`/projects/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...properties.map((p) => ({ url: absoluteUrl(propertyPath(p)), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), lastModified: p.updatedAt, priority: 0.6 })),
    ...investments.map((i) => ({ url: absoluteUrl(`/investment/${i.slug}`), lastModified: i.updatedAt, priority: 0.7 })),
    ...news.map((n) => ({ url: absoluteUrl(`/news/${n.slug}`), lastModified: new Date(n.publishedOn), priority: 0.5 })),
  ];
}
