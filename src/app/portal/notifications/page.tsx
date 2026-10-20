import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { markNotificationsReadAction } from "@/lib/actions/notifications";
import { NOTIFICATION_TYPES, getNotifications } from "@/lib/data";
import { requireUser } from "@/lib/require-user";

export const metadata = { title: "Notifications", robots: { index: false } };

export default async function PortalNotificationsPage() {
  const user = await requireUser(["buyer"]);
  const items = await getNotifications(user.id, 100);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <PortalShell title="Notifications">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">{unread ? `${unread} unread` : "All caught up."}</p>
        {unread > 0 && (
          <form action={markNotificationsReadAction}>
            <button type="submit" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50">
              Mark all as read
            </button>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">No notifications yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((n) => (
            <li key={n.id} className={`rounded-xl border bg-white p-4 ${n.readAt ? "" : "border-teal-200 shadow-sm"}`}>
              <p className="flex items-start justify-between gap-3">
                <span className="font-medium">
                  {!n.readAt && <span aria-label="Unread" className="mr-2 inline-block h-2 w-2 rounded-full bg-teal-600 align-middle" />}
                  {n.title}
                </span>
                <span className="shrink-0 text-xs text-stone-500">
                  {n.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" })}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-stone-500">{NOTIFICATION_TYPES[n.type as keyof typeof NOTIFICATION_TYPES] ?? "Update"}</p>
              {n.message && <p className="mt-2 text-sm text-stone-700">{n.message}</p>}
              {/^\/portal(\/|#|$)/.test(n.link) && (
                <Link href={n.link} className="mt-2 inline-block text-sm font-medium text-teal-800 hover:underline">
                  Open →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
