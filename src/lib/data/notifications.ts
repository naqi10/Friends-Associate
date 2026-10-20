import { prisma } from "../db";

export type NotificationInput = { type: string; title: string; message?: string; link?: string };

/** Notification types (PROJECT_SPEC §26). */
export const NOTIFICATION_TYPES = {
  payment_due: "Payment due",
  payment_received: "Payment received",
  document: "Document uploaded",
  progress: "Project progress updated",
  announcement: "Important announcement",
} as const;

export async function notifyUser(userId: string, n: NotificationInput) {
  return prisma.notification.create({
    data: { userId, type: n.type, title: n.title.slice(0, 160), message: (n.message ?? "").slice(0, 1000), link: n.link ?? "" },
  });
}

/** Every buyer with an active booking in the project. Returns how many were notified. */
export async function notifyProjectBuyers(projectId: string, n: NotificationInput) {
  const buyers = await prisma.booking.findMany({
    where: { projectId, status: { not: "Cancelled" }, user: { active: true } },
    distinct: ["userId"],
    select: { userId: true },
  });
  if (!buyers.length) return 0;
  await prisma.notification.createMany({
    data: buyers.map((b) => ({ userId: b.userId, type: n.type, title: n.title.slice(0, 160), message: (n.message ?? "").slice(0, 1000), link: n.link ?? "" })),
  });
  return buyers.length;
}

export async function getNotifications(userId: string, take = 20) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationsRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

/** When the last payment reminder for this booking was sent, so staff cannot send one twice in a day. */
export async function lastPaymentReminder(userId: string, bookingId: string) {
  const n = await prisma.notification.findFirst({
    where: { userId, type: "payment_due", link: `/portal/payments#b-${bookingId}` },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return n?.createdAt ?? null;
}
