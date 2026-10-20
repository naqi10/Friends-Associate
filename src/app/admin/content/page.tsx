import Link from "next/link";
import { FormError } from "@/components/FormError";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { CheckboxField, Field, Notice, TextAreaField } from "@/components/admin/Field";
import { PhotoPicker } from "@/components/admin/PhotoPicker";
import { saveHeroAction, saveHomeExtrasAction } from "@/lib/actions/content";
import { getHeroContent, getHeroMedia, getHomeExtras, getTestimonialRows } from "@/lib/data";
import { hasRealImage } from "@/lib/media";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Website content" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

/** Section heading inside a card: a title and one line of help. */
function CardHeading({ title, help }: { title: string; help?: string }) {
  return (
    <div className="border-b border-line pb-4">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {help && <p className="mt-1 text-sm text-muted">{help}</p>}
    </div>
  );
}

export default async function AdminContentPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, hero, media, extras, testimonials] = await Promise.all([
    searchParams,
    getHeroContent(),
    getHeroMedia(),
    getHomeExtras(),
    getTestimonialRows(),
  ]);

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Website content</h1>
          <p className="mt-1 text-sm text-muted">Change the website&apos;s text and photos. Changes go live as soon as you press Save.</p>
        </div>
        <Link href="/" target="_blank" className="rounded-full border-[1.5px] border-line-strong bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist">
          Open home page ↗
        </Link>
      </div>
      <ContentTabs active="/admin/content" />
      <Notice message={sp.saved === "home" ? "Home page details saved." : sp.saved ? "Home page top section saved. It is live now." : undefined} />
      <FormError code={sp.error} />

      <form action={saveHeroAction} className="admin-card mt-6 p-6 sm:p-8">
        <CardHeading title="Home page — top section (hero)" help="The first thing visitors see: the big title, the short description, two buttons and two photos." />

        <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-5">
            <h3 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Text</h3>
            <Field label="Small heading above the title" name="subtitle" defaultValue={hero.subtitle} maxLength={80} />
            <Field
              label="Main title"
              name="title"
              defaultValue={hero.title}
              maxLength={120}
              required
              hint="Put *stars* around words to show them in grey italics, e.g. Building landmarks, *from ideas* to execution."
            />
            <TextAreaField
              label="Description"
              name="description"
              rows={4}
              maxLength={400}
              defaultValue={hero.description}
              hint="Also used as the home page description in Google results (first 160 characters)."
            />
            <h3 className="pt-2 text-xs font-semibold tracking-[0.2em] text-muted uppercase">Buttons</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Main button text" name="button_text" defaultValue={hero.buttonText} maxLength={40} />
              <Field label="Main button link" name="button_url" defaultValue={hero.buttonUrl} hint="e.g. /projects" />
              <Field label="Second button text" name="secondary_button_text" defaultValue={hero.secondaryButtonText} maxLength={40} />
              <Field label="Second button link" name="secondary_button_url" defaultValue={hero.secondaryButtonUrl} hint="e.g. /properties?tab=buy" />
            </div>
            <CheckboxField label="Show this section on the home page" name="active" defaultChecked={hero.active} />
          </div>

          <div className="space-y-5">
            <h3 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Photos</h3>
            <div className="grid items-start gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <PhotoPicker
                  label="Large photo"
                  name="image_file"
                  removeName="image_remove"
                  currentSrc={hasRealImage(hero.imagePath) ? hero.imagePath : null}
                  alt={media.mainAlt}
                  hint="Best: a wide landscape photo, at least 1600 px wide."
                />
                <Field
                  label="What the large photo shows"
                  name="image_alt"
                  defaultValue={media.mainAlt}
                  maxLength={160}
                  hint="A short description for Google and for visitors who cannot see images."
                />
              </div>
              <div className="space-y-3">
                <PhotoPicker
                  label="Small photo"
                  name="image2_file"
                  removeName="image2_remove"
                  currentSrc={hasRealImage(media.secondImage) ? media.secondImage : null}
                  alt={media.secondAlt}
                  shape="square"
                  hint="Shown as a square next to the offices box. Portrait or square photos work best."
                />
                <Field label="What the small photo shows" name="image2_alt" defaultValue={media.secondAlt} maxLength={160} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <button type="submit" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-body">
            Save top section
          </button>
          <p className="text-xs text-muted">New or deleted photos only change on the website after you press Save.</p>
        </div>
      </form>

      <form action={saveHomeExtrasAction} id="home-details" className="admin-card mt-8 scroll-mt-24 p-6 sm:p-8">
        <CardHeading title="Home page details" help="Small details around the home page and footer. Anything left empty is hidden on the website." />

        <div className="mt-6 grid gap-8 xl:grid-cols-2">
          <div className="space-y-5">
            <h3 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Company facts</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Years of experience"
                name="years"
                defaultValue={extras.years}
                maxLength={20}
                placeholder="e.g. 15+"
                hint="Shown in the numbers under the title. Empty: the number of cities is shown instead."
              />
              <Field label="Office hours" name="hours" defaultValue={extras.hours} maxLength={60} placeholder="e.g. Mon–Sat, 9am–6pm" />
            </div>
            <h3 className="pt-2 text-xs font-semibold tracking-[0.2em] text-muted uppercase">Social media links</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Facebook" name="facebook" defaultValue={extras.social.facebook} placeholder="https://facebook.com/…" />
              <Field label="Instagram" name="instagram" defaultValue={extras.social.instagram} placeholder="https://instagram.com/…" />
              <Field label="YouTube" name="youtube" defaultValue={extras.social.youtube} placeholder="https://youtube.com/…" />
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">What clients say</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {testimonials.map((t, i) => (
                <fieldset key={t.key} className="space-y-3 rounded-[22px] border border-line bg-paper p-4">
                  <legend className="px-1 text-sm font-semibold text-ink">Client review {i + 1}</legend>
                  <TextAreaField label="What they said" name={`t${i + 1}_quote`} rows={3} maxLength={300} defaultValue={t.quote} />
                  <Field label="Client name" name={`t${i + 1}_name`} defaultValue={t.name} maxLength={80} />
                  <Field label="Project, city" name={`t${i + 1}_project`} defaultValue={t.project} maxLength={120} placeholder="e.g. 10 Marla house, Rahim Yar Khan" />
                </fieldset>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <button type="submit" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-body">
            Save home page details
          </button>
        </div>
      </form>
    </div>
  );
}
