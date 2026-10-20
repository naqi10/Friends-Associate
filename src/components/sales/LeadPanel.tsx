import Link from "next/link";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Icon } from "@/components/admin/shell/icons";
import {
  addLeadNoteAction,
  assignLeadAction,
  closeLeadAction,
  nextStageAction,
  setFollowUpAction,
  setLeadStageAction,
} from "@/lib/actions/sales-desk";
import { LEAD_SOURCES, LEAD_STATUSES, labelOf } from "@/lib/catalog";
import type { getLead, getLeadActivities } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { AutoDate, AutoSelect } from "./AutoSubmit";
import { ContactButtons } from "./ContactButtons";
import { initials } from "./ui";

type Lead = NonNullable<Awaited<ReturnType<typeof getLead>>>;
type Activity = Awaited<ReturnType<typeof getLeadActivities>>[number];

const KIND_LABEL: Record<string, string> = {
  note: "Note",
  status: "Stage",
  assign: "Assigned",
  followup: "Follow-up",
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  convert: "Converted",
};

/** Detail panel for one lead on the Sales desk (side panel on computers, full screen on phones). */
export function LeadPanel({
  lead,
  activities,
  staff,
  canEdit,
  canConvert,
  returnTo,
  closeHref,
}: {
  lead: Lead;
  activities: Activity[];
  staff: { id: string; name: string }[];
  canEdit: boolean;
  canConvert: boolean;
  returnTo: string;
  closeHref: string;
}) {
  const ended = lead.status === "converted" || lead.status === "closed";
  const hidden = (
    <>
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="return" value={returnTo} />
    </>
  );
  const facts: [string, string][] = [
    ["Phone", lead.phone],
    ...(lead.email ? ([["Email", lead.email]] as [string, string][]) : []),
    ["Source", labelOf(LEAD_SOURCES, lead.source)],
    ["Received", formatDate(lead.createdAt.toISOString())],
    ...(lead.budget ? ([["Budget", lead.budget]] as [string, string][]) : []),
    ...(lead.service ? ([["Service", lead.service]] as [string, string][]) : []),
    ...(lead.location ? ([["Location", lead.location]] as [string, string][]) : []),
  ];

  return (
    <aside aria-label={`Lead: ${lead.name}`} className="admin-card p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-base font-semibold text-paper">{initials(lead.name)}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[22px] font-semibold">{lead.name}</h2>
          <p className="truncate text-[15px] text-muted">
            {lead.interest}
            {lead.city ? ` · ${lead.city}` : ""}
          </p>
        </div>
        <Link href={closeHref} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist hover:bg-line">
          <Icon name="close" />
        </Link>
      </div>

      <div className="mt-6">
        <ContactButtons leadId={lead.id} phone={lead.phone} email={lead.email} name={lead.name} />
      </div>

      {lead.message && <p className="mt-5 rounded-2xl bg-paper p-4 text-sm whitespace-pre-line text-body">&ldquo;{lead.message}&rdquo;</p>}

      <h3 className="mt-7 text-xs font-semibold tracking-[0.2em] text-muted uppercase">Stage</h3>
      <ol className="mt-3 space-y-1">
        {LEAD_STATUSES.map((s) => {
          const on = s.key === lead.status;
          return (
            <li key={s.key}>
              {canEdit && !on ? (
                <form action={setLeadStageAction}>
                  {hidden}
                  <input type="hidden" name="status" value={s.key} />
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left text-[15px] text-muted hover:bg-paper hover:text-ink">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-line-strong" />
                    {s.label}
                  </button>
                </form>
              ) : (
                <p className={`flex items-center gap-3 px-1 py-1.5 text-[15px] ${on ? "font-semibold text-ink" : "text-muted"}`}>
                  <span className={`h-3.5 w-3.5 rounded-full ${on ? "bg-ink ring-4 ring-ink/10" : "border-2 border-line-strong"}`} />
                  {s.label}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {canEdit && !ended && lead.status !== "follow_up" && (
        <form action={nextStageAction} className="mt-4">
          {hidden}
          <button type="submit" className="w-full rounded-full border-[1.5px] border-ink py-3 text-[15px] font-semibold hover:bg-mist">
            Move to next stage →
          </button>
        </form>
      )}

      {canEdit && (
        <div id="assign" className="mt-6 grid scroll-mt-24 gap-4 sm:grid-cols-2">
          <form action={assignLeadAction}>
            {hidden}
            <label className="block text-sm text-muted">
              Assigned to
              <AutoSelect
                name="assigned_to_id"
                defaultValue={lead.assignedTo?.id ?? ""}
                className="mt-1.5 w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-[15px] text-ink"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </AutoSelect>
            </label>
          </form>
          <form action={setFollowUpAction}>
            {hidden}
            <label className="block text-sm text-muted">
              Follow-up date
              <AutoDate
                name="follow_up_date"
                defaultValue={lead.followUpDate ?? ""}
                className="mt-1.5 w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[15px] text-ink"
              />
            </label>
          </form>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-[15px]">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>

      {canEdit && (
        <form action={addLeadNoteAction} className="mt-6">
          {hidden}
          <label className="block text-sm text-muted">
            Add a note
            <textarea
              name="note"
              rows={3}
              maxLength={2000}
              required
              placeholder="Called, asked for payment plan…"
              className="mt-1.5 w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-[15px] text-ink outline-none focus:border-ink"
            />
          </label>
          <button type="submit" className="mt-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
            Save note
          </button>
        </form>
      )}

      {activities.length > 0 && (
        <>
          <h3 className="mt-7 text-xs font-semibold tracking-[0.2em] text-muted uppercase">History</h3>
          <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
            {activities.map((a) => (
              <li key={a.id} className="text-sm">
                <p className="text-xs text-muted">
                  <span className="font-semibold text-body">{KIND_LABEL[a.kind] ?? a.kind}</span> · {a.user?.name ?? "System"} ·{" "}
                  {a.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="mt-0.5 whitespace-pre-line text-ink">{a.text}</p>
              </li>
            ))}
          </ol>
        </>
      )}

      {lead.convertedUser && (
        <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          Converted to customer{" "}
          <Link href={`/admin/customers/${lead.convertedUser.id}`} className="font-semibold underline">
            {lead.convertedUser.name}
          </Link>
          .
        </p>
      )}

      {canEdit && !ended && (
        <div className="mt-7 flex flex-wrap gap-3 border-t border-line pt-6">
          {canConvert && (
            <Link href={`/admin/customers/new?lead=${lead.id}`} className="flex-1 rounded-full bg-ink px-6 py-3.5 text-center text-[15px] font-semibold whitespace-nowrap text-paper hover:bg-body">
              Convert to customer
            </Link>
          )}
          <form action={closeLeadAction}>
            {hidden}
            <ConfirmButton tone="neutral" title="Close this lead?" message="It moves to Closed and leaves the open list. You can reopen it by choosing another stage." confirmLabel="Yes, close lead" className="px-6 py-3.5 text-[15px]">
              Close lead
            </ConfirmButton>
          </form>
        </div>
      )}
      <p className="mt-5 text-right">
        <Link href={`/sales/leads/${lead.id}`} className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline">
          Open full page
        </Link>
      </p>
    </aside>
  );
}
