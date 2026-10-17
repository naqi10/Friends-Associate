import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { CheckboxField, Field, Notice, TextAreaField } from "@/components/admin/Field";
import { ImageField } from "@/components/admin/ImageField";
import { deleteTeamMemberAction, saveAboutAction, saveTeamMemberAction } from "@/lib/actions/site-content";
import { getAboutLists, getCompany, getManagement } from "@/lib/data";
import { hasRealImage } from "@/lib/media";
import { requireAdmin } from "@/lib/permissions";
import type { ManagementMember } from "@/lib/types";

export const metadata = { title: "About & team" };

const SAVED: Record<string, string> = {
  about: "About page text saved.",
  team: "Team member saved.",
  "team-deleted": "Team member removed.",
};

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

function MemberForm({ m }: { m?: ManagementMember }) {
  return (
    <form action={saveTeamMemberAction} className="space-y-3">
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" name="name" defaultValue={m?.name} maxLength={80} required />
        <Field label="Position" name="title" defaultValue={m?.title} maxLength={80} required placeholder="e.g. Chief Executive" />
        <Field label="Experience" name="experience" defaultValue={m?.experience} maxLength={80} placeholder="e.g. 20 years in construction" />
        <Field label="Display order" name="sort_order" type="number" min={0} max={999} defaultValue={m?.sort_order ?? 0} hint="Lower numbers show first." />
      </div>
      <TextAreaField label="Short biography" name="bio" defaultValue={m?.bio} maxLength={600} rows={3} />
      <ImageField current={m?.photo_path} label="Photo" />
      {m && hasRealImage(m.photo_path) && <CheckboxField label="Remove the current photo" name="remove_photo" />}
      <CheckboxField label="Show on the About page" name="active" defaultChecked={m ? m.active : true} />
      <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
        {m ? "Save" : "Add team member"}
      </button>
    </form>
  );
}

export default async function AboutContentPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, company, lists, team] = await Promise.all([searchParams, getCompany(), getAboutLists(), getManagement({ includeHidden: true })]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/content" />
      <h1 className="text-2xl font-bold">Website content</h1>
      <ContentTabs active="/admin/content/about" />
      <p className="mt-4 text-sm text-stone-600">
        Text and team shown on the{" "}
        <Link href="/about" target="_blank" className="text-teal-800 underline">
          About page
        </Link>
        . The page heading is under Page headings.
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      <form id="about" action={saveAboutAction} className="mt-6 scroll-mt-24 space-y-4 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Company profile</h2>
        <TextAreaField label="Company profile" name="experience" defaultValue={company.experience} maxLength={1500} rows={5} />
        <TextAreaField label="Mission" name="mission" defaultValue={company.mission} maxLength={600} rows={3} />
        <TextAreaField label="Vision" name="vision" defaultValue={company.vision} maxLength={600} rows={3} />
        {lists.map((l) => (
          <fieldset key={l.key} className="space-y-3 rounded-lg border border-stone-200 p-4">
            <Field label="Section heading" name={`${l.key}.title`} defaultValue={l.title} maxLength={80} />
            <TextAreaField
              label="Points"
              name={`${l.key}.items`}
              defaultValue={l.items.join("\n")}
              rows={5}
              hint="One point per line, up to 10. Leave empty to hide this section."
            />
          </fieldset>
        ))}
        <p className="text-xs text-stone-500">Leave a box empty to hide that section on the About page.</p>
        <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
          Save About page
        </button>
      </form>

      <section id="team" className="mt-8 scroll-mt-24">
        <h2 className="text-lg font-semibold">Management team</h2>
        {team.length === 0 && <p className="mt-2 text-sm text-stone-500">No team members yet.</p>}
        <div className="mt-4 space-y-4">
          {team.map((m) => (
            <details key={m.id} id={`m-${m.id}`} className="scroll-mt-24 rounded-xl border bg-white p-5">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                {hasRealImage(m.photo_path) ? (
                  <Image src={m.photo_path} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-500">
                    {m.name.charAt(0)}
                  </span>
                )}
                <span className="font-medium">{m.name}</span>
                <span className="text-sm text-stone-500">{m.title}</span>
                {!m.active && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Hidden</span>}
              </summary>
              <div className="mt-4 border-t pt-4">
                <MemberForm m={m} />
                <form action={deleteTeamMemberAction} className="mt-4 border-t pt-4">
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton message={`Remove ${m.name} from the team? This cannot be undone. To hide them instead, untick "Show on the About page".`}>
                    Remove {m.name} from the team
                  </ConfirmButton>
                </form>
              </div>
            </details>
          ))}
        </div>
        <div id="team-new" className="mt-6 scroll-mt-24 rounded-xl border border-dashed bg-white p-5">
          <h3 className="mb-3 font-semibold">Add a team member</h3>
          <MemberForm />
        </div>
      </section>
    </div>
  );
}
