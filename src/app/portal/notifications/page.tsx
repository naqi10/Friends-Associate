import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { PortalShell } from "@/components/PortalShell";
import { CARD } from "@/components/portal/ui";
import { markNotificationsReadAction } from "@/lib/actions/notifications";
import { NOTIFICATION_TYPES, getNotifications } from "@/lib/data";
import { getPortal } from "@/lib/portal";

export const metadata = { title: "Notifications", robots: { index: false } };

const ICONS: Record<string, string> = { payment_due: "clock", payment_received: "receipt", document: "file", progress: "helmet", announcement: "bell" };

export default async function PortalNotificationsPage() {
  const { user } = await getPortal();
  const items = await getNotifications(user.id, 100);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <PortalShell title="Notifications" subtitle={unread ? `${unread} unread` : "All caught up"}>
      <div className="mx-auto max-w-3xl">
        {unread > 0 && (
          <form action={markNotificationsReadAction} className="mb-4 flex justify-end">
            <button type="submit" className="min-h-11 rounded-full border-[1.5px] border-line-strong bg-paper px-5 text-[15px] font-medium hover:bg-mist">
              Mark all as read
            </button>
          </form>
        )}
        {items.length === 0 ? (
          <p className="rounded-2xl bg-mist p-8 text-center text-[16px] text-muted">No notifications yet. Payment reminders, receipts, documents and site updates will appear here.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => {
              const link = /^\/portal(\/|#|$)/.test(n.link) ? n.link : "";
              const body = (
                <>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${n.readAt ? "bg-mist" : "bg-ink text-paper"}`}>
                    <Icon name={ICONS[n.type] ?? "bell"} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={`text-[17px] ${n.readAt ? "font-medium" : "font-semibold"}`}>
                        {!n.readAt && <span className="sr-only">Unread: </span>}
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[13px] text-muted">
                        {n.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" })}
                      </span>
                    </span>
                    <span className="block text-[13px] text-muted">{NOTIFICATION_TYPES[n.type as keyof typeof NOTIFICATION_TYPES] ?? "Update"}</span>
                    {n.message && <span className="mt-1.5 block text-[15px] text-body">{n.message}</span>}
                  </span>
                  {link && <Icon name="chevron" className="mt-3 h-5 w-5 shrink-0 text-muted" />}
                </>
              );
              return (
                <li key={n.id} className={`${CARD} ${n.readAt ? "" : "ring-1 ring-ink/15"}`}>
                  {link ? (
                    <Link href={link} className="flex gap-4 p-5 hover:bg-canvas">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-4 p-5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PortalShell>
  );
}
