import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { Field, Notice } from "@/components/admin/Field";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { saveHeroAction, saveHomeExtrasAction } from "@/lib/actions/content";
import { getHeroContent, getHeroMedia, getHomeExtras, getTestimonialRows } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Website content" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminContentPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, hero, media, extras, testimonials] = await Promise.all([searchParams, getHeroContent(), getHeroMedia(), getHomeExtras(), getTestimonialRows()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/content" />
      <h1 className="text-2xl font-bold">Website content</h1>
      <ContentTabs active="/admin/content" />
      <p className="mt-1 text-sm text-stone-600">
        Changes go live on the{" "}
        <Link href="/" className="text-teal-800 underline" target="_blank">
          home page
        </Link>{" "}
        as soon as you save.
      </p>
      <Notice message={sp.saved === "home" ? "Home page details saved." : sp.saved ? "Home page hero saved." : undefined} />
      <FormError code={sp.error} />

      <form action={saveHeroAction} className="mt-6 space-y-4 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Home page hero</h2>
        <Field label="Small heading above the title" name="subtitle" defaultValue={hero.subtitle} maxLength={80} />
        <Field
          label="Main title"
          name="title"
          defaultValue={hero.title}
          maxLength={120}
          required
          hint="Wrap words in *asterisks* to show them in grey italics, e.g. Building landmarks, *from ideas* to execution."
        />
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Description</span>
          <textarea
            name="description"
            rows={3}
            maxLength={400}
            defaultValue={hero.description}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-stone-500">Also used as the home page description in Google results (first 160 characters).</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Main button text" name="button_text" defaultValue={hero.buttonText} maxLength={40} />
          <Field label="Main button link" name="button_url" defaultValue={hero.buttonUrl} hint="e.g. /projects" />
          <Field label="Second button text" name="secondary_button_text" defaultValue={hero.secondaryButtonText} maxLength={40} />
          <Field label="Second button link" name="secondary_button_url" defaultValue={hero.secondaryButtonUrl} hint="e.g. /properties?tab=buy" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Large photo"
            name="image_path"
            defaultValue={hero.imagePath}
            hint="A file in web/public/images, e.g. /images/home-hero-commercial-building.webp."
          />
          <Field label="Large photo description (alt text)" name="image_alt" defaultValue={media.mainAlt} maxLength={160} hint="What the photo shows, for Google and screen readers." />
          <Field label="Small photo" name="image2_path" defaultValue={media.secondImage} hint="e.g. /images/home-hero-petrol-station.webp" />
          <Field label="Small photo description (alt text)" name="image2_alt" defaultValue={media.secondAlt} maxLength={160} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={hero.active} className="h-4 w-4" />
          Show the hero on the home page
        </label>
        <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
          Save hero
        </button>
      </form>

      <form action={saveHomeExtrasAction} id="home-details" className="mt-8 scroll-mt-24 space-y-4 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Home page details</h2>
        <p className="text-xs text-stone-500">Anything left empty is hidden on the website.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Years of experience" name="years" defaultValue={extras.years} maxLength={20} placeholder="e.g. 15+" hint="Shown in the hero stats. Empty: the number of cities is shown instead." />
          <Field label="Office hours" name="hours" defaultValue={extras.hours} maxLength={60} placeholder="e.g. Mon–Sat, 9am–6pm" />
        </div>
        {testimonials.map((t, i) => (
          <fieldset key={t.key} className="space-y-3 rounded-lg border border-stone-200 p-4">
            <legend className="px-1 text-sm font-medium">Testimonial {i + 1}</legend>
            <label className="block text-sm">
              <span className="font-medium text-stone-700">Quote</span>
              <textarea name={`t${i + 1}_quote`} rows={2} maxLength={300} defaultValue={t.quote} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client name" name={`t${i + 1}_name`} defaultValue={t.name} maxLength={80} />
              <Field label="Project, city" name={`t${i + 1}_project`} defaultValue={t.project} maxLength={120} placeholder="e.g. 10 Marla house, Rahim Yar Khan" />
            </div>
          </fieldset>
        ))}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Facebook link" name="facebook" defaultValue={extras.social.facebook} placeholder="https://facebook.com/…" />
          <Field label="Instagram link" name="instagram" defaultValue={extras.social.instagram} placeholder="https://instagram.com/…" />
          <Field label="YouTube link" name="youtube" defaultValue={extras.social.youtube} placeholder="https://youtube.com/…" />
        </div>
        <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
          Save home page details
        </button>
      </form>
    </div>
  );
}
