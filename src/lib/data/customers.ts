import { prisma } from "../db";

/** Fields safe to send to admin screens. Never includes the password hash. */
const customerSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  phone: true,
  city: true,
  cnic: true,
  active: true,
  documentDownloadPaidAt: true,
} as const;

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  cnic: string;
  active: boolean;
  feePaidAt: string | null;
  bookings: number;
  outstandingPkr: number;
};

export async function getCustomerRows(): Promise<CustomerRow[]> {
  const rows = await prisma.user.findMany({
    where: { role: "buyer" },
    orderBy: { name: "asc" },
    select: { ...customerSelect, bookings: { select: { outstandingPkr: true } } },
  });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email ?? "",
    phone: u.phone,
    city: u.city,
    cnic: u.cnic,
    active: u.active,
    feePaidAt: u.documentDownloadPaidAt?.toISOString() ?? null,
    bookings: u.bookings.length,
    outstandingPkr: u.bookings.reduce((sum, b) => sum + b.outstandingPkr, 0),
  }));
}

export async function getCustomer(id: string) {
  return prisma.user.findFirst({ where: { id, role: "buyer" }, select: customerSelect });
}

export async function getBuyerOptions() {
  return prisma.user.findMany({
    where: { role: "buyer", active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, _count: { select: { bookings: { where: { status: { not: "Cancelled" } } } } } },
  });
}

/** Whether another account already signs in with this user ID. */
export async function usernameInUse(username: string, excludeId?: string) {
  const row = await prisma.user.findFirst({ where: { username, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
  return !!row;
}

export async function emailInUse(email: string, excludeId?: string) {
  const row = await prisma.user.findFirst({
    where: { email, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return !!row;
}

export async function createCustomer(data: {
  name: string;
  email: string | null;
  username: string | null;
  phone: string;
  city: string;
  cnic: string;
  passwordHash: string;
}) {
  return prisma.user.create({ data: { ...data, role: "buyer" }, select: { id: true } });
}

export async function updateCustomer(
  id: string,
  data: Partial<{ name: string; email: string | null; username: string | null; phone: string; city: string; cnic: string; active: boolean; documentDownloadPaidAt: Date | null; passwordHash: string }>,
) {
  return prisma.user.update({ where: { id }, data, select: customerSelect });
}

/* ---------- Customers directory (filters, stats, overdue) ---------- */

export type CustomerFilter = {
  q?: string;
  city?: string;
  downloads?: "unlocked" | "locked";
  account?: "active" | "disabled" | "all";
  sort?: "outstanding" | "name";
};

export type DirectoryRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  active: boolean;
  /** Has an active booking with a payment received, so their documents show in the portal. */
  unlocked: boolean;
  bookings: number;
  property: string | null;
  outstandingPkr: number;
  /** Earliest unpaid instalment across active bookings. */
  next: { date: string; daysUntil: number } | null;
};

const dayDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** A confirmed customer: at least one active booking with money received. Only they see their documents. */
export const CONFIRMED_CUSTOMER = { bookings: { some: { status: { not: "Cancelled" }, paidPkr: { gt: 0 } } } };

/** Who sees their files in the portal: design clients with no booking, and confirmed buyers (see documentsVisible). */
export const SEES_DOCUMENTS = { OR: [{ bookings: { none: {} } }, CONFIRMED_CUSTOMER] };

/** Whether this customer's files show in their portal. */
export async function canSeeDocuments(userId: string) {
  return (await prisma.user.count({ where: { id: userId, role: "buyer", ...SEES_DOCUMENTS } })) > 0;
}

export async function getCustomerDirectory(f: CustomerFilter, page: number, today: string, pageSize = 25) {
  const q = f.q?.trim();
  const contains = q ? { contains: q, mode: "insensitive" as const } : undefined;
  const users = await prisma.user.findMany({
    where: {
      role: "buyer",
      ...(f.account === "disabled" ? { active: false } : f.account === "all" ? {} : { active: true }),
      ...(f.city ? { city: f.city } : {}),
      ...(f.downloads === "unlocked" ? SEES_DOCUMENTS : f.downloads === "locked" ? { NOT: SEES_DOCUMENTS } : {}),
      ...(contains
        ? { OR: [{ name: contains }, { email: contains }, { username: contains }, { phone: { contains: q } }, { bookings: { some: { property: { title: contains } } } }] }
        : {}),
    },
    take: 5000,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      phone: true,
      city: true,
      active: true,
      _count: { select: { bookings: true } },
      bookings: {
        where: { status: { not: "Cancelled" } },
        orderBy: { bookedOn: "asc" },
        select: { outstandingPkr: true, paidPkr: true, nextPaymentDate: true, property: { select: { title: true } } },
      },
    },
  });
  const rows: DirectoryRow[] = users.map((u) => {
    const due = u.bookings.filter((b) => b.outstandingPkr > 0).map((b) => b.nextPaymentDate).sort()[0];
    return {
      id: u.id,
      name: u.name,
      // Shown where the email was: customers without one are known by their user ID.
      email: u.email ?? (u.username ? `User ID: ${u.username}` : ""),
      phone: u.phone,
      city: u.city,
      active: u.active,
      unlocked: u._count.bookings === 0 || u.bookings.some((b) => b.paidPkr > 0),
      bookings: u.bookings.length,
      property: u.bookings[0]?.property.title ?? null,
      outstandingPkr: u.bookings.reduce((s, b) => s + b.outstandingPkr, 0),
      next: due ? { date: due, daysUntil: dayDiff(today, due) } : null,
    };
  });
  rows.sort((a, b) => (f.sort === "name" ? a.name.localeCompare(b.name) : b.outstandingPkr - a.outstandingPkr || a.name.localeCompare(b.name)));
  const total = rows.length;
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCustomerStats() {
  const [customers, activeBookings, outstanding, locked, cities] = await Promise.all([
    prisma.user.count({ where: { role: "buyer", active: true } }),
    prisma.booking.count({ where: { status: { not: "Cancelled" } } }),
    prisma.booking.aggregate({ where: { status: { not: "Cancelled" } }, _sum: { outstandingPkr: true } }),
    // Buyers with a booking but no payment yet (design clients without a booking are not counted).
    prisma.user.count({ where: { role: "buyer", active: true, bookings: { some: {} }, NOT: CONFIRMED_CUSTOMER } }),
    prisma.user.findMany({ where: { role: "buyer" }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);
  return { customers, activeBookings, outstandingPkr: outstanding._sum.outstandingPkr ?? 0, locked, cities: cities.map((c) => c.city).filter(Boolean) };
}
