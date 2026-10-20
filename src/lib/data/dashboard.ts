import { prisma } from "../db";
import { DIVISIONS } from "../catalog";
import { todayPk } from "../format";

const ACTIVE_BOOKING = { status: { not: "Cancelled" }, outstandingPkr: { gt: 0 } };

export type Period = "today" | "week" | "month" | "quarter";
export const PERIODS: { key: Period; label: string; days: number; phrase: string }[] = [
  { key: "today", label: "Today", days: 0, phrase: "due today" },
  { key: "week", label: "Week", days: 7, phrase: "due this week" },
  { key: "month", label: "Month", days: 30, phrase: "due this month" },
  { key: "quarter", label: "Quarter", days: 90, phrase: "due this quarter" },
];

/** YYYY-MM-DD plus n days (dates are stored as plain strings). */
export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export type DueRow = {
  bookingId: string;
  customerId: string;
  customer: string;
  phone: string;
  unit: string;
  dueDate: string;
  amountPkr: number;
  /** Negative = overdue by that many days; 0 = today. */
  daysUntil: number;
};

async function activeBookings() {
  const rows = await prisma.booking.findMany({
    where: ACTIVE_BOOKING,
    orderBy: { nextPaymentDate: "asc" },
    select: {
      id: true,
      nextPaymentDate: true,
      nextPaymentAmountPkr: true,
      outstandingPkr: true,
      user: { select: { id: true, name: true, phone: true } },
      property: { select: { title: true } },
    },
  });
  const today = todayPk();
  return rows.map(
    (b): DueRow => ({
      bookingId: b.id,
      customerId: b.user.id,
      customer: b.user.name,
      phone: b.user.phone,
      unit: b.property.title,
      dueDate: b.nextPaymentDate,
      amountPkr: Math.min(b.nextPaymentAmountPkr, b.outstandingPkr),
      daysUntil: daysBetween(today, b.nextPaymentDate),
    }),
  );
}

/** Counts for the sidebar badges. */
export async function getStaffBadges() {
  const today = todayPk();
  const [newLeads, overdue] = await Promise.all([
    prisma.lead.count({ where: { status: "new" } }),
    prisma.booking.count({ where: { ...ACTIVE_BOOKING, nextPaymentDate: { lt: today } } }),
  ]);
  return { newLeads, overdue };
}

/** Overdue instalments and those due within the next `days` days, soonest first. */
export async function getDuePayments(days: number) {
  const today = todayPk();
  const limit = addDays(today, days);
  return (await activeBookings()).filter((r) => r.dueDate <= limit);
}

export async function getDashboard(period: Period) {
  const p = PERIODS.find((x) => x.key === period) ?? PERIODS[2];
  const today = todayPk();
  const [bookings, outstanding, unitGroups, inquiries, leads, customers, projects, staff, settings] = await Promise.all([
    activeBookings(),
    prisma.booking.aggregate({ where: { status: { not: "Cancelled" } }, _sum: { outstandingPkr: true } }),
    prisma.property.groupBy({ by: ["status"], where: { archivedAt: null }, _count: { _all: true } }),
    prisma.inquiry.count(),
    prisma.lead.count(),
    prisma.user.count({ where: { role: "buyer", active: true } }),
    prisma.project.groupBy({ by: ["division"], where: { archivedAt: null }, _count: { _all: true } }),
    prisma.user.findMany({ where: { role: { not: "buyer" }, active: true }, orderBy: [{ role: "asc" }, { name: "asc" }], select: { id: true, name: true, role: true } }),
    prisma.siteSettings.findFirst(),
  ]);

  const overdue = bookings.filter((b) => b.daysUntil < 0);
  const overdueSum = overdue.reduce((s, b) => s + b.amountPkr, 0);
  const limit = addDays(today, p.days);
  const inPeriod = bookings.filter((b) => b.daysUntil >= 0 && b.dueDate <= limit);
  const upcoming = [...overdue, ...inPeriod];
  const tomorrow = bookings.filter((b) => b.daysUntil === 1);
  const units = Object.fromEntries(unitGroups.map((g) => [g.status, g._count._all])) as Record<string, number>;
  const projectTotal = projects.reduce((s, g) => s + g._count._all, 0);

  return {
    period: p,
    today,
    outstandingPkr: outstanding._sum.outstandingPkr ?? 0,
    overdue,
    overdueSum,
    dueInPeriod: inPeriod.length,
    upcoming,
    upcomingSum: upcoming.reduce((s, b) => s + b.amountPkr, 0),
    dueTomorrow: tomorrow,
    units: { available: units.Available ?? 0, booked: units.Booked ?? 0, sold: units.Sold ?? 0 },
    pipeline: { inquiries, leads, customers },
    projects: {
      total: projectTotal,
      divisions: DIVISIONS.filter((d) => projects.some((g) => g.division === d.key)).map((d) => d.label),
    },
    staff,
    settings: {
      extraCities: settings?.extraCitiesEnabled ?? false,
      whatsapp: settings?.whatsappAutomationEnabled ?? false,
      gateway: settings?.paymentGatewayEnabled ?? false,
    },
  };
}

/** Admin search across the records the caller may see. Each list is limited to a few rows. */
export async function searchAdmin(q: string, scope: { customers: boolean; units: boolean; projects: boolean; leads: boolean; bookings: boolean }) {
  const term = q.trim().slice(0, 80);
  const contains = { contains: term, mode: "insensitive" as const };
  const take = 8;
  const [customers, units, projects, leads, bookings] = await Promise.all([
    scope.customers
      ? prisma.user.findMany({
          where: { role: "buyer", OR: [{ name: contains }, { email: contains }, { phone: contains }, { cnic: contains }] },
          take,
          select: { id: true, name: true, email: true, phone: true, active: true },
        })
      : [],
    scope.units
      ? prisma.property.findMany({
          where: { OR: [{ title: contains }, { locality: contains }, { city: contains }] },
          take,
          select: { id: true, title: true, city: true, status: true, archivedAt: true },
        })
      : [],
    scope.projects
      ? prisma.project.findMany({ where: { OR: [{ name: contains }, { location: contains }, { city: contains }] }, take, select: { id: true, name: true, city: true, archivedAt: true } })
      : [],
    scope.leads
      ? prisma.lead.findMany({
          where: { OR: [{ name: contains }, { phone: contains }, { email: contains }, { interest: contains }] },
          take,
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, phone: true, status: true },
        })
      : [],
    scope.bookings
      ? prisma.booking.findMany({
          where: { OR: [{ user: { name: contains } }, { property: { title: contains } }] },
          take,
          select: { id: true, status: true, user: { select: { name: true } }, property: { select: { title: true } } },
        })
      : [],
  ]);
  return { customers, units, projects, leads, bookings };
}

