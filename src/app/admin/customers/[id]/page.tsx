import Link from "next/link";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DocumentUpload, FilePickForm } from "@/components/admin/DocumentUpload";
import { Icon } from "@/components/admin/shell/icons";
import { Field, Notice, SelectField } from "@/components/admin/Field";
import { markDocumentCheckedAction, setDocumentFileAction, uploadDocumentAction } from "@/lib/actions/documents";
import { deleteCustomerAction, deleteDocumentAction } from "@/lib/actions/lifecycle";
import {
  resetCustomerPasswordAction,
  updateCustomerAction,
} from "@/lib/actions/customers";
import { DOCUMENT_TYPES } from "@/lib/catalog";
import { documentsVisible, isCustomerProof } from "@/lib/document-access";
import { CITIES, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { customerBlockers, getBookingsForUserDetailed, getCustomer, getDocumentsForUser, MAX_BOOKINGS_PER_BUYER } from "@/lib/data";
import { formatDate, formatPkr } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Customer" };

const SAVED: Record<string, string> = {
  created: "Customer created. You can now add their bookings.",
  profile: "Profile saved.",
  password: "Password reset. The customer has been signed out of all devices.",
  "1": "Document uploaded to the customer's portal.",
  attached: "File attached. The customer was told it is ready.",
  version: "New version uploaded. The customer was told about the update.",
  checked: "Marked as checked.",
  deleted: "File deleted. The customer no longer sees it.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function CustomerDetailPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("users", "view");
  const canEdit = can("users", "update");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [customer, bookings, blockers, docs] = await Promise.all([
    getCustomer(id),
    getBookingsForUserDetailed(id),
    customerBlockers(id),
    can("documents", "view") ? getDocumentsForUser(id) : Promise.resolve([]),
  ]);
  if (!customer) notFound();
  const projects = [...new Map(bookings.map((b) => [b.project.id, { id: b.project.id, name: b.project.name }])).values()];
  const returnTo = `/admin/customers/${customer.id}`;
  const confirmed = documentsVisible(bookings);

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <Link href="/admin/customers" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-body hover:border-ink hover:text-ink">
        ← All customers
      </Link>
      <h1 className="mt-5 text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">{customer.name}</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        {[customer.username && `User ID: ${customer.username}`, customer.email].filter(Boolean).join(" · ")} · {customer.active ? "Active account" : "Disabled account"}
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      {canEdit ? (
        <section className="mt-8 admin-card p-6">
          <h2 className="text-[18px] font-semibold">Profile</h2>
          <form action={updateCustomerAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={customer.id} />
            <div className="sm:col-span-2">
              <Field label="Full name" name="name" defaultValue={customer.name} required />
            </div>
            <Field label="User ID (for sign in)" name="username" defaultValue={customer.username ?? ""} autoCapitalize="none" spellCheck={false} placeholder="e.g. ali.khan" />
            <Field label="Email (optional, also signs in)" name="email" type="email" defaultValue={customer.email ?? ""} />
            <Field label="Phone" name="phone" type="tel" defaultValue={customer.phone} />
            <SelectField label="City" name="city" options={CITIES} defaultValue={customer.city} required />
            <Field label="CNIC" name="cnic" defaultValue={customer.cnic} pattern="\d{5}-\d{7}-\d" />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="active" defaultChecked={customer.active} className="h-4 w-4" />
              Account active (unticking signs the customer out and blocks login)
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
                Save profile
              </button>
            </div>
          </form>
        </section>
      ) : (
        // View-only roles (e.g. Sales) see the details as text, not as a greyed-out form.
        <section className="mt-8 admin-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px] font-semibold">Profile</h2>
            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-muted">View only</span>
          </div>
          <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {(
              [
                ["User ID", customer.username],
                ["Email", customer.email],
                ["Phone", customer.phone],
                ["City", customer.city],
                ["CNIC", customer.cnic],
                ["Account", customer.active ? "Active" : "Disabled"],
              ] as [string, string | null][]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-3 text-[15px]">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium">
                  {k === "Phone" && v ? (
                    <a href={`tel:${v.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4">
                      {v}
                    </a>
                  ) : (
                    v || "—"
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">

        {canEdit && (
        <section id="password" className="admin-card scroll-mt-24 p-6">
          <h2 className="font-semibold">Reset password</h2>
          <form action={resetCustomerPasswordAction} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={customer.id} />
            <Field label="New password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
            <Field label="Confirm new password" name="confirm" type="password" required autoComplete="new-password" />
            <button type="submit" className="rounded-full border-[1.5px] border-line-strong bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist">
              Reset password
            </button>
          </form>
        </section>
        )}
      </div>

      <section className="mt-6 admin-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">
            Bookings ({bookings.length}/{MAX_BOOKINGS_PER_BUYER})
          </h2>
          {can("bookings", "add") && customer.active && bookings.length < MAX_BOOKINGS_PER_BUYER && (
            <Link
              href={`/admin/bookings/new?buyer=${customer.id}`}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-body"
            >
              Add booking
            </Link>
          )}
        </div>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No properties assigned to this customer yet.</p>
        ) : (
          <ul className="mt-4 divide-y text-sm">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">
                    {b.property.title}
                    {b.status === "Cancelled" && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">Cancelled</span>}
                  </p>
                  <p className="text-stone-600">
                    {b.project.name} · Paid {formatPkr(b.paid_pkr)} · Outstanding {formatPkr(b.outstanding_pkr)}
                  </p>
                </div>
                {can("bookings", "view") && (
                  <Link href={`/admin/bookings/${b.id}`} className="text-teal-800 hover:underline">
                    Manage payments
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {can("documents", "view") && (
        <section id="documents" className="mt-6 scroll-mt-24 admin-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Documents ({docs.length})</h2>
            <p className={`text-sm ${confirmed ? "text-teal-800" : "text-amber-800"}`}>
              {confirmed ? "Visible to the customer" : "Not visible yet: shows once their booking has its first payment"}
            </p>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Naqsha / drawings, agreements, letters, payment slips (PDF, DWG, images or ZIP, up to 200 MB): upload them here and they appear in{" "}
            {customer.name}&rsquo;s portal under Documents. You can add more files later, replace a file with a newer one, or delete it.
          </p>
          <div className={`mt-5 grid gap-6 ${can("documents", "add") && customer.active ? "lg:grid-cols-[1fr_380px]" : ""}`}>
            {docs.length === 0 ? (
              <p className="rounded-2xl bg-mist p-5 text-sm text-stone-600">No documents yet.</p>
            ) : (
              <ul className="divide-y divide-line self-start rounded-2xl border border-line">
                {docs.map((d) => {
                  const fromCustomer = isCustomerProof(d);
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist">
                        <Icon name="file" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {d.name}
                          {fromCustomer && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Sent by customer · check it</span>}
                        </p>
                        <p className="text-xs text-stone-500">
                          {d.category} · {formatDate(d.issued_on)}
                          {d.version ? ` · ${d.version}` : ""}
                        </p>
                      </div>
                      {d.storage_path ? (
                        <a href={`/api/documents/${d.id}/download`} className="inline-flex items-center gap-1 font-medium text-teal-800 hover:underline">
                          <Icon name="download" className="h-4 w-4" /> Download
                        </a>
                      ) : (
                        <span className="text-xs text-stone-500">No file yet</span>
                      )}
                      {fromCustomer && can("documents", "update") && (
                        <form action={markDocumentCheckedAction}>
                          <input type="hidden" name="id" value={d.id} />
                          <input type="hidden" name="return" value={returnTo} />
                          <button type="submit" className="rounded-full border-[1.5px] border-line-strong bg-white px-3 py-1.5 text-xs font-semibold hover:bg-mist">
                            Mark checked
                          </button>
                        </form>
                      )}
                      {d.storage_path && can("documents", "update") && (
                        <FilePickForm
                          audience="buyer"
                          action={setDocumentFileAction}
                          id={d.id}
                          returnTo={returnTo}
                          className="rounded-full border-[1.5px] border-line-strong bg-white px-3 py-1.5 text-xs font-semibold hover:bg-mist"
                          label="Replace"
                        />
                      )}
                      {can("documents", "delete") && (
                        <form action={deleteDocumentAction}>
                          <input type="hidden" name="id" value={d.id} />
                          <input type="hidden" name="return" value={returnTo} />
                          <ConfirmButton
                            className="!rounded-full !px-3 !py-1.5 !text-xs"
                            message={`Delete "${d.name}"? ${customer.name} will no longer see it. This cannot be undone.`}
                          >
                            Delete
                          </ConfirmButton>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {can("documents", "add") && customer.active && (
              <div className="rounded-2xl bg-canvas p-5 ring-1 ring-line">
                <h3 className="mb-4 font-semibold">Upload for {customer.name}</h3>
                <DocumentUpload
                  action={uploadDocumentAction}
                  types={DOCUMENT_TYPES}
                  projects={projects}
                  buyers={[]}
                  returnTo={returnTo}
                  fixedBuyer={{ id: customer.id, name: customer.name, confirmed }}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {can("users", "delete") && blockers && (
        <section className="mt-6 rounded-[28px] border-2 border-red-200 bg-white shadow-[0_18px_40px_-18px_rgb(14_14_14/0.28)] p-6">
          <h2 className="font-semibold text-red-800">Delete customer</h2>
          {blockers.bookings + blockers.payments + blockers.documents > 0 ? (
            <p className="mt-1 text-sm text-stone-600">
              This customer cannot be deleted because their account holds {blockers.bookings} booking(s), {blockers.payments} payment(s) and{" "}
              {blockers.documents} document(s), which must be kept. To stop them signing in, untick &ldquo;Account active&rdquo; in the profile instead.
            </p>
          ) : (
            <form action={deleteCustomerAction} className="mt-2">
              <input type="hidden" name="id" value={customer.id} />
              <p className="text-sm text-stone-600">
                Removes this account permanently, for example one created by mistake. They will no longer be able to sign in.
              </p>
              <ConfirmButton className="mt-3" message={`Permanently delete the customer account of ${customer.name}? This cannot be undone.`}>
                Delete customer
              </ConfirmButton>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
