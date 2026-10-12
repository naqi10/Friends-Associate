import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getCompany, getManagement } from "@/lib/data";

export const metadata: Metadata = pageMetadata({
  title: "About us",
  description: "Company profile, mission, vision and leadership at Friends Associates.",
  path: "/about",
});

export default async function AboutPage() {
  const company = await getCompany();
  const management = await getManagement();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">About {company.name}</h1>
      <p className="mt-4 text-stone-600">{company.experience}</p>
      <h2 className="mt-10 text-xl font-semibold">Mission</h2>
      <p className="mt-2 text-stone-700">{company.mission}</p>
      <h2 className="mt-8 text-xl font-semibold">Vision</h2>
      <p className="mt-2 text-stone-700">{company.vision}</p>
      <h2 className="mt-10 text-xl font-semibold">Management</h2>
      <ul className="mt-4 space-y-4">
        {management.map((m) => (
          <li key={m.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="font-medium">{m.name}</p>
            <p className="text-sm text-teal-800">{m.title}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
