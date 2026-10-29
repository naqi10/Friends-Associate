import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getUserById, notifyProjectBuyers, notifyUser, type NotificationInput } from "@/lib/data";
import { sendNotificationEmail } from "@/lib/email";

/** Portal notification for one customer, plus the same message by email (sent after the response). */
export async function notifyCustomer(userId: string, n: NotificationInput) {
  await notifyUser(userId, n);
  after(async () => {
    const user = await getUserById(userId);
    if (user?.active) await sendNotificationEmail(user, n);
  });
}

/** Notifies every customer with an active booking in the project, in the portal and by email. Returns how many. */
export async function notifyProjectCustomers(projectId: string, n: NotificationInput) {
  const count = await notifyProjectBuyers(projectId, n);
  if (count > 0) {
    after(async () => {
      const buyers = await prisma.user.findMany({
        where: { role: "buyer", active: true, bookings: { some: { projectId, status: { not: "Cancelled" } } } },
        select: { name: true, email: true },
      });
      for (const b of buyers) if (b.email) await sendNotificationEmail({ name: b.name, email: b.email }, n);
    });
  }
  return count;
}
