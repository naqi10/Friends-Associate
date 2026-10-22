import Link from "next/link";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { StaffAddPanel } from "@/components/admin/StaffAddPanel";
import { Icon } from "@/components/admin/shell/icons";
import { changeStaffRoleAction, createStaffAction, deleteStaffAction, setStaffActiveAction } from "@/lib/actions/staff";
import { CITIES } from "@/lib/constants";
import { getStaffRows } from "@/lib/data";
import type { StaffRow } from "@/lib/data/staff";
import { ROLE_LABELS, STAFF_ROLES, type StaffRole } from "@/lib/permission-catalog";
import { requireAdmin } from "@/lib/permissions";
import { isRoleEnabled } from "@/lib/release";

export const metadata = { title: "Staff" };

type Props = { searchParams: Promise<{ error?: string; saved?: string; n?: string; add?: string; role?: string; q?: string }> };

const SCOPE: Record<StaffRole, string> = {
  admin: "Everything",
  project_manager: "PM desk, projects, documents",
  sales: "Sales desk, customers, bookings",
};
const CHIP: Record<StaffRole, string> = {
  admin: "bg-ink text-paper",
  project_manager: "bg-violet-50 text-violet-800",
  sales: "bg-teal-50 text-teal-800",
};
const AVATAR: Record<StaffRole, string> = {
  admin: "bg-ink text-paper",
  project_manager: "bg-violet-50 text-violet-800",
  sales: "bg-teal-50 text-teal-800",
};
const BAR: Record<StaffRole, string> = { sales: "bg-teal-700", project_manager: "bg-violet-700", admin: "bg-ink" };
const ORDER: StaffRole[] = ["sales", "project_manager", "admin"];
const SHORT: Record<StaffRole, string> = { sales: "sales", project_manager: "PM", admin: "admin" };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
const signedIn = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function StaffPage({ searchParams }: Props) {
  const { user: me } = await requireAdmin();
  const [sp, rows] = await Promise.all([searchParams, getStaffRows()]);
  const active = rows.filter((r) => r.active);
  const inactive = rows.filter((r) => !r.active);
  const never = active.filter((r) => !r.lastLoginAt);
  const filter = sp.role === "inactive" || (STAFF_ROLES as readonly string[]).includes(sp.role ?? "") ? sp.role! : "all";
  const q = sp.q?.trim().toLowerCase() ?? "";
  const list = (filter === "inactive" ? inactive : filter === "all" ? active : active.filter((r) => r.role === filter)).filter(
    (r) => !q || `${r.name} ${r.email} ${r.city}`.toLowerCase().includes(q),
  );
  const count = (role: StaffRole) => active.filter((r) => r.role === role).length;
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { role: filter === "all" ? undefined : filter, q: sp.q || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/staff${s ? `?${s}` : ""}`;
  };
  const showAdd = sp.add === "1";
  const saved: Record<string, string> = {
    created: "Staff account created. Share the email and temporary password with them privately.",
    role: "Role changed. They have been signed out and see their new menu on next sign-in.",
    deactivated: "Account switched off. They have been signed out and cannot sign in.",
    activated: "Account switched on. They can sign in again.",
    deleted: `Account deleted. Their name stays in the history${Number(sp.n) > 0 ? `; ${sp.n} open lead${sp.n === "1" ? " is" : "s are"} now unassigned on the Sales desk` : ""}.`,
  };

  function menu(r: StaffRow) {
    const self = r.id === me.id;
    return (
      <details className="relative">
        <summary aria-label={`Actions for ${r.name}`} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-line hover:bg-mist">
          <Icon name="more" />
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-64 space-y-0.5 rounded-2xl border border-line bg-white p-2 text-left text-sm shadow-xl">
          <Link href={`/admin/staff/${r.id}`} className="block rounded-xl px-3 py-2 hover:bg-mist">
            Edit details
          </Link>
          {self ? (
            <Link href="/account" className="block rounded-xl px-3 py-2 hover:bg-mist">
              Change my password
            </Link>
          ) : (
            <>
              <Link href={`/admin/staff/${r.id}#password`} className="block rounded-xl px-3 py-2 hover:bg-mist">
                Reset password
              </Link>
              {r.active &&
                STAFF_ROLES.filter((role) => role !== r.role).map((role) => (
                  <form key={role} action={changeStaffRoleAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="role" value={role} />
                    <button type="submit" className="w-full rounded-xl px-3 py-2 text-left hover:bg-mist">
                      Make {ROLE_LABELS[role]}
                    </button>
                  </form>
                ))}
              <form action={setStaffActiveAction} className="border-t border-line pt-1">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                {r.active ? (
                  <ConfirmButton
                    tone="neutral"
                    title="Switch account off?"
                    confirmLabel="Switch off"
                    message={`${r.name} will be signed out at once and cannot sign in until you switch the account on again. Nothing is deleted.`}
                    className="w-full !rounded-xl !border-0 !bg-transparent !px-3 !py-2 text-left !font-normal hover:!bg-mist"
                  >
                    Switch account off
                  </ConfirmButton>
                ) : (
                  <button type="submit" className="w-full rounded-xl px-3 py-2 text-left hover:bg-mist">
                    Switch account on
                  </button>
                )}
              </form>
              <form action={deleteStaffAction}>
                <input type="hidden" name="id" value={r.id} />
                <ConfirmButton
                  title="Delete this account?"
                  confirmLabel="Delete account"
                  message={`${r.name} (${r.email}) will lose their login for good and disappear from Staff. Their name stays on the history (audit log, payments, leads) and any open leads assigned to them become unassigned. This cannot be undone.`}
                  className="w-full !rounded-xl !bg-transparent !px-3 !py-2 text-left !font-normal !text-red-700 hover:!bg-red-50"
                >
                  Delete account
                </ConfirmButton>
              </form>
            </>
          )}
        </div>
      </details>
    );
  }

  const status = (r: StaffRow, compact = false) =>
    !r.active ? (
      <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold text-muted">Switched off</span>
    ) : r.lastLoginAt ? (
      <span className="inline-flex items-center gap-2 text-[15px] text-body">
        {!compact && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
        {compact ? `Signed in ${signedIn(r.lastLoginAt).replace(/ \d{4},/, ",")}` : signedIn(r.lastLoginAt)}
      </span>
    ) : (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">Never signed in</span>
    );

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">Staff</h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="lg:hidden">
              {active.length} active · {ORDER.map((r) => `${count(r)} ${SHORT[r]}`).join(" · ")}
            </span>
            <span className="hidden lg:inline">
              Team logins and roles. What each role can do is set on{" "}
              <Link href="/admin/permissions" className="text-teal-800 underline underline-offset-4">
                Permissions
              </Link>
              .
            </span>
          </p>
        </div>
        <Link href={link({ add: "1" })} className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
          <Icon name="plus" className="h-4.5 w-4.5" />
          <span className="lg:hidden">Add</span>
          <span className="hidden lg:inline">Add staff member</span>
        </Link>
      </div>
      {sp.saved && saved[sp.saved] && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{saved[sp.saved]}</p>}
      <FormError code={sp.error} />
      {(!isRoleEnabled("sales") || !isRoleEnabled("project_manager")) && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Not live yet on this site: {[!isRoleEnabled("sales") && "Sales", !isRoleEnabled("project_manager") && "Project manager"].filter(Boolean).join(" and ")} logins.
          You can create these accounts now; they can sign in once the release setting is changed.
        </p>
      )}

      <dl className="admin-card mt-8 hidden grid-cols-[1fr_2fr_1fr] divide-x divide-line lg:grid">
        <div className="p-7">
          <dt className="text-[15px] text-muted">Active accounts</dt>
          <dd className="mt-2 text-[34px] leading-none font-semibold">{active.length}</dd>
        </div>
        <div className="p-7">
          <dt className="text-[15px] text-muted">By role</dt>
          <dd className="mt-3">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-mist">
              {ORDER.map((r) => (count(r) ? <span key={r} className={BAR[r]} style={{ flexGrow: count(r) }} /> : null))}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
              {ORDER.map((r) => (
                <span key={r} className="inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-sm ${BAR[r]}`} />
                  <strong>{count(r)}</strong> {ROLE_LABELS[r]}
                </span>
              ))}
            </p>
          </dd>
        </div>
        <div className="p-7">
          <dt className="text-[15px] text-muted">Never signed in</dt>
          <dd className={`mt-2 text-[34px] leading-none font-semibold ${never.length ? "text-amber-700" : ""}`}>{never.length}</dd>
        </div>
      </dl>

      {never.length > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-[22px] border-[1.5px] border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
          <Icon name="userPlus" className="h-5 w-5 shrink-0" />
          <p className="min-w-0 flex-1 text-[15px]">
            <strong>
              {never.length} staff {never.length === 1 ? "hasn't" : "haven't"} signed in yet.
            </strong>{" "}
            <span className="max-sm:hidden">Make sure they received their email and temporary password, and ask them to change it after signing in.</span>
          </p>
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 grid-cols-[minmax(0,1fr)] min-[1300px]:has-[aside]:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Filter by role" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-mist p-1 text-[15px] whitespace-nowrap">
              {(
                [
                  ["all", "All", active.length],
                  ["sales", "Sales", count("sales")],
                  ["project_manager", "Project manager", count("project_manager")],
                  ["admin", "Admin", count("admin")],
                  ...(inactive.length ? ([["inactive", "Switched off", inactive.length]] as const) : []),
                ] as const
              ).map(([k, l, n]) => (
                <Link key={k} href={link({ role: k === "all" ? undefined : k })} className={`flex items-center gap-2 rounded-full px-4 py-2 ${filter === k ? "bg-white font-semibold shadow-sm" : "text-body hover:text-ink"}`}>
                  {l} <span className="rounded-full bg-black/5 px-2 text-sm">{n}</span>
                </Link>
              ))}
            </nav>
            <form method="get" action="/admin/staff" className="min-w-0 flex-1 basis-[260px]">
              {filter !== "all" && <input type="hidden" name="role" value={filter} />}
              <label className="flex items-center gap-3 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-2.5 focus-within:border-ink">
                <Icon name="search" className="h-5 w-5 text-muted" />
                <input name="q" type="search" defaultValue={sp.q} placeholder="Name, email or city" aria-label="Search staff" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
              </label>
            </form>
          </div>

          {list.length === 0 ? (
            <p className="admin-card mt-5 px-6 py-12 text-center text-muted">No staff match.</p>
          ) : (
            <>
              <div className="admin-card mt-5 hidden md:block">
                <table className="w-full table-fixed text-left text-[15px]">
                  <thead className="text-sm text-muted">
                    <tr className="border-b border-line">
                      <th className="py-4 pr-3 pl-6 font-medium">Member</th>
                      <th className="w-[170px] px-3 py-4 font-medium">Role</th>
                      <th className="w-[180px] px-3 py-4 font-medium">Last sign-in</th>
                      <th className="w-16 py-4 pr-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className={`border-b border-line align-middle last:border-0 ${r.active ? "" : "opacity-70"}`}>
                        <td className="py-4 pr-3 pl-6">
                          <div className="flex items-center gap-3.5">
                            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${AVATAR[r.role]}`}>{initials(r.name)}</span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 font-semibold">
                                <Link href={`/admin/staff/${r.id}`} className="truncate hover:underline">
                                  {r.name}
                                </Link>
                                {r.id === me.id && <span className="rounded-full border border-line px-2 text-xs font-normal text-muted">You</span>}
                              </p>
                              <p className="truncate text-sm text-muted">
                                {r.email} · {r.city}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${CHIP[r.role]}`}>{ROLE_LABELS[r.role]}</span>
                          <p className="mt-1.5 text-sm text-muted">{SCOPE[r.role]}</p>
                        </td>
                        <td className="px-3 py-4">{status(r)}</td>
                        <td className="py-4 pr-4 text-right">{menu(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-line px-6 py-4 text-sm text-muted">
                  Change role, reset password, switch off or delete from the{" "}
                  <Icon name="more" className="inline h-4 w-4 align-[-3px]" /> menu. Deleted and switched-off staff keep their history in the audit log.
                </p>
              </div>

              <ul className="admin-card mt-5 divide-y divide-line md:hidden">
                {list.map((r) => (
                  <li key={r.id} className={`flex items-start gap-3.5 p-4 ${r.active ? "" : "opacity-70"}`}>
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${AVATAR[r.role]}`}>{initials(r.name)}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/staff/${r.id}`} className="block truncate text-[17px] font-semibold">
                        {r.name}
                        {r.id === me.id && <span className="ml-2 align-middle text-xs font-normal text-muted">(you)</span>}
                      </Link>
                      <p className="truncate text-sm text-muted">
                        {r.email} · {r.city}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-sm font-semibold ${CHIP[r.role]}`}>{ROLE_LABELS[r.role]}</span>
                        {status(r, true)}
                      </div>
                    </div>
                    {menu(r)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-6 text-center md:hidden">
            <Link href="/admin/permissions" className="text-[15px] font-semibold text-teal-800 underline underline-offset-4">
              Edit role permissions →
            </Link>
          </p>
        </section>

        {showAdd && (
          <aside id="add" className="admin-card order-first p-5 sm:p-6 min-[1300px]:order-none min-[1300px]:sticky min-[1300px]:top-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-semibold">Add staff member</h2>
              <Link href={link({ add: undefined })} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-mist hover:bg-line">
                <Icon name="close" />
              </Link>
            </div>
            <StaffAddPanel action={createStaffAction} cities={CITIES} roles={STAFF_ROLES.map((r) => ({ key: r, label: ROLE_LABELS[r], scope: r === "admin" ? "Full access, including staff and permissions" : r === "sales" ? "Leads, customers and bookings" : "PM desk, project progress and documents" }))} />
          </aside>
        )}
      </div>
    </div>
  );
}
