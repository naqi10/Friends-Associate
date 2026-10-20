import { prisma } from "../db";

export const MAX_BOOKINGS_PER_BUYER = 10;

/** Booking status used when a sale falls through; the unit goes back on sale and payments stay on record. */
export const CANCELLED = "Cancelled";

/** Prisma filter for bookings that still hold their unit. */
export const ACTIVE = { status: { not: CANCELLED } };

export class BookingRuleError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export type BookingRow = {
  id: string;
  buyerId: string;
  buyerName: string;
  propertyTitle: string;
  propertyStatus: string;
  projectName: string;
  status: string;
  bookedOn: string;
  totalPricePkr: number;
  paidPkr: number;
  outstandingPkr: number;
  nextPaymentDate: string;
  nextPaymentAmountPkr: number;
};

export async function getBookingRows(): Promise<BookingRow[]> {
  const rows = await prisma.booking.findMany({
    orderBy: { nextPaymentDate: "asc" },
    include: {
      user: { select: { id: true, name: true } },
      property: { select: { title: true, status: true } },
      project: { select: { name: true } },
    },
  });
  return rows.map((b) => ({
    id: b.id,
    buyerId: b.user.id,
    buyerName: b.user.name,
    propertyTitle: b.property.title,
    propertyStatus: b.property.status,
    projectName: b.project.name,
    status: b.status,
    bookedOn: b.bookedOn,
    totalPricePkr: b.totalPricePkr,
    paidPkr: b.paidPkr,
    outstandingPkr: b.outstandingPkr,
    nextPaymentDate: b.nextPaymentDate,
    nextPaymentAmountPkr: b.nextPaymentAmountPkr,
  }));
}

export async function getBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true, status: true, pricePkr: true } },
      project: { select: { name: true } },
    },
  });
}

export async function getAvailablePropertyOptions() {
  return prisma.property.findMany({
    where: { status: "Available", archivedAt: null, bookings: { none: ACTIVE }, projectId: { not: null }, listingType: "sale" },
    orderBy: { title: "asc" },
    select: { id: true, title: true, pricePkr: true, project: { select: { name: true } } },
  });
}

export type NewBookingInput = {
  userId: string;
  propertyId: string;
  status: string;
  bookedOn: string;
  paidPkr: number;
  paymentsReceived: number;
  paymentsRemaining: number;
  nextPaymentDate: string;
  nextPaymentAmountPkr: number;
};

/**
 * Enforces the schema rules from DATABASE_SCHEMA.md in one transaction:
 * buyer has < 10 bookings, the property is Available and unbooked, the project matches the property,
 * total price is copied from the property, and paid + outstanding = total.
 */
export async function createBooking(input: NewBookingInput) {
  return prisma.$transaction(async (tx) => {
    const buyer = await tx.user.findUnique({
      where: { id: input.userId },
      select: { role: true, active: true, _count: { select: { bookings: { where: ACTIVE } } } },
    });
    if (!buyer || buyer.role !== "buyer" || !buyer.active) throw new BookingRuleError("buyer");
    if (buyer._count.bookings >= MAX_BOOKINGS_PER_BUYER) throw new BookingRuleError("limit");

    const property = await tx.property.findUnique({
      where: { id: input.propertyId },
      select: { status: true, pricePkr: true, projectId: true, archivedAt: true, bookings: { where: ACTIVE, select: { id: true } } },
    });
    if (!property || property.status !== "Available" || property.archivedAt || property.bookings.length > 0) throw new BookingRuleError("property");
    // Instalment bookings exist only for units in company projects; standalone listings go through leads.
    if (!property.projectId) throw new BookingRuleError("property");
    if (input.paidPkr > property.pricePkr) throw new BookingRuleError("overpaid");

    const booking = await tx.booking.create({
      data: {
        ...input,
        projectId: property.projectId as string,
        totalPricePkr: property.pricePkr,
        outstandingPkr: property.pricePkr - input.paidPkr,
      },
    });
    await tx.property.update({ where: { id: input.propertyId }, data: { status: "Booked" } });
    return booking;
  });
}

export type BookingUpdateInput = {
  status: string;
  paidPkr: number;
  paymentsReceived: number;
  paymentsRemaining: number;
  nextPaymentDate: string;
  nextPaymentAmountPkr: number;
  propertyStatus: "Booked" | "Sold";
};

export async function updateBooking(id: string, input: BookingUpdateInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({ where: { id } });
    if (!current) throw new BookingRuleError("missing");
    if (current.status === CANCELLED) throw new BookingRuleError("cancelled");
    if (input.paidPkr > current.totalPricePkr) throw new BookingRuleError("overpaid");
    const { propertyStatus, ...fields } = input;
    const updated = await tx.booking.update({
      where: { id },
      data: { ...fields, outstandingPkr: current.totalPricePkr - input.paidPkr },
    });
    await tx.property.update({ where: { id: current.propertyId }, data: { status: propertyStatus } });
    return { before: current, after: updated };
  });
}

export type NewPaymentInput = {
  amountPkr: number;
  paidOn: string;
  method: string;
  referenceNumber: string;
  remarks: string;
  createdById: string;
};

/**
 * Records one received instalment as its own receipt row, and in the same transaction moves the money
 * from outstanding to paid and advances the instalment counters.
 */
export async function recordBookingPayment(id: string, input: NewPaymentInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({ where: { id } });
    if (!current) throw new BookingRuleError("missing");
    if (current.status === CANCELLED) throw new BookingRuleError("cancelled");
    if (input.amountPkr <= 0 || input.amountPkr > current.outstandingPkr) throw new BookingRuleError("amount");
    const payment = await tx.payment.create({ data: { ...input, bookingId: id, userId: current.userId } });
    const updated = await tx.booking.update({
      where: { id },
      data: {
        paidPkr: current.paidPkr + input.amountPkr,
        outstandingPkr: current.outstandingPkr - input.amountPkr,
        paymentsReceived: current.paymentsReceived + 1,
        paymentsRemaining: Math.max(0, current.paymentsRemaining - 1),
      },
    });
    return { before: current, after: updated, payment };
  });
}

/**
 * Undoes a payment entered by mistake. The row is kept (status "reversed", who, when, why) so the
 * receipt number stays traceable; the booking figures are put back as they were before it.
 */
export async function reverseBookingPayment(paymentId: string, actorId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new BookingRuleError("missing");
    if (payment.status !== "received") throw new BookingRuleError("already-reversed");
    const current = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (!current) throw new BookingRuleError("missing");
    // The paid figure may have been edited by hand since; never let it go negative.
    if (current.paidPkr < payment.amountPkr) throw new BookingRuleError("reverse-figures");
    const reversed = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "reversed", reversedAt: new Date(), reversedById: actorId, reversalReason: reason },
    });
    const updated = await tx.booking.update({
      where: { id: current.id },
      data: {
        paidPkr: current.paidPkr - payment.amountPkr,
        outstandingPkr: current.outstandingPkr + payment.amountPkr,
        paymentsReceived: Math.max(0, current.paymentsReceived - 1),
        paymentsRemaining: current.paymentsRemaining + 1,
      },
    });
    return { payment: reversed, before: current, after: updated };
  });
}

export type PaymentRow = {
  id: string;
  receiptNo: number;
  bookingId: string;
  amountPkr: number;
  paidOn: string;
  method: string;
  referenceNumber: string;
  remarks: string;
  status: string;
  recordedBy: string | null;
  reversalReason: string;
  reversedAt: Date | null;
};

const PAYMENT_SELECT = {
  id: true,
  receiptNo: true,
  bookingId: true,
  amountPkr: true,
  paidOn: true,
  method: true,
  referenceNumber: true,
  remarks: true,
  status: true,
  reversalReason: true,
  reversedAt: true,
  createdBy: { select: { name: true } },
} as const;

function mapPayment(p: { createdBy: { name: string } | null } & Omit<PaymentRow, "recordedBy">): PaymentRow {
  const { createdBy, ...rest } = p;
  return { ...rest, recordedBy: createdBy?.name ?? null };
}

/** Newest first. */
export async function getPaymentsForBooking(bookingId: string): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    where: { bookingId },
    orderBy: [{ paidOn: "desc" }, { receiptNo: "desc" }],
    select: PAYMENT_SELECT,
  });
  return rows.map(mapPayment);
}

/** Only this buyer's own payments: the user id comes from the session, never from the request. */
export async function getPaymentsForUser(userId: string): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    where: { userId },
    orderBy: [{ paidOn: "desc" }, { receiptNo: "desc" }],
    select: PAYMENT_SELECT,
  });
  return rows.map(mapPayment);
}

/** Everything a printed receipt shows. Callers must check ownership or staff rights first. */
export async function getPaymentReceipt(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      user: { select: { id: true, name: true, email: true, phone: true, cnic: true } },
      booking: {
        select: {
          id: true,
          totalPricePkr: true,
          property: { select: { title: true, size: true, type: true } },
          project: { select: { name: true, city: true } },
        },
      },
    },
  });
}

/**
 * Money that is in "paid" but has no receipt row: opening amounts entered with the booking,
 * payments from before itemised records existed, and manual corrections.
 */
export function unitemisedPaid(paidPkr: number, payments: Pick<PaymentRow, "amountPkr" | "status">[]): number {
  const itemised = payments.filter((p) => p.status === "received").reduce((sum, p) => sum + p.amountPkr, 0);
  return paidPkr - itemised;
}

/**
 * Cancels a booking whose sale fell through. Nothing is deleted: the booking and its payments stay as
 * history (refunds are handled outside the system), and the unit goes back on sale.
 */
export async function cancelBooking(id: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({ where: { id } });
    if (!current) throw new BookingRuleError("missing");
    if (current.status === CANCELLED) throw new BookingRuleError("cancelled");
    const updated = await tx.booking.update({
      where: { id },
      data: { status: CANCELLED, cancelledAt: new Date(), cancelReason: reason, nextPaymentAmountPkr: 0 },
    });
    await tx.property.update({ where: { id: current.propertyId }, data: { status: "Available" } });
    return { before: current, after: updated };
  });
}

/* ---------- Bookings & payments desk ---------- */

export type DeskTab = "all" | "overdue" | "today" | "paid";

export type DeskBooking = {
  id: string;
  buyer: { id: string; name: string; phone: string };
  property: string;
  project: { id: string; name: string };
  totalPkr: number;
  paidPkr: number;
  outstandingPkr: number;
  nextDate: string;
  nextAmountPkr: number;
  /** Days until the next instalment (negative = overdue); null when fully paid. */
  daysUntil: number | null;
};

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Every active (not cancelled) booking with its payment position, for the desk and its figures. */
export async function getBookingDesk(today: string) {
  const rows = await prisma.booking.findMany({
    where: { status: { not: CANCELLED } },
    orderBy: { nextPaymentDate: "asc" },
    select: {
      id: true,
      totalPricePkr: true,
      paidPkr: true,
      outstandingPkr: true,
      nextPaymentDate: true,
      nextPaymentAmountPkr: true,
      user: { select: { id: true, name: true, phone: true } },
      property: { select: { title: true } },
      project: { select: { id: true, name: true } },
    },
  });
  const all: DeskBooking[] = rows.map((b) => ({
    id: b.id,
    buyer: b.user,
    property: b.property.title,
    project: b.project,
    totalPkr: b.totalPricePkr,
    paidPkr: b.paidPkr,
    outstandingPkr: b.outstandingPkr,
    nextDate: b.nextPaymentDate,
    nextAmountPkr: Math.min(b.nextPaymentAmountPkr, b.outstandingPkr),
    daysUntil: b.outstandingPkr > 0 ? days(today, b.nextPaymentDate) : null,
  }));
  // Most urgent first: overdue (oldest first), then due soonest, then fully paid.
  all.sort((a, b) => (a.daysUntil ?? 1e9) - (b.daysUntil ?? 1e9));
  const overdue = all.filter((b) => b.daysUntil !== null && b.daysUntil < 0);
  const today_ = all.filter((b) => b.daysUntil === 0);
  const paid = all.filter((b) => b.outstandingPkr === 0);
  const sum = (list: DeskBooking[], k: "totalPkr" | "paidPkr" | "outstandingPkr" | "nextAmountPkr") => list.reduce((s, b) => s + b[k], 0);
  return {
    all,
    tabs: { all: all.length, overdue: overdue.length, today: today_.length, paid: paid.length },
    figures: {
      bookedPkr: sum(all, "totalPkr"),
      receivedPkr: sum(all, "paidPkr"),
      outstandingPkr: sum(all, "outstandingPkr"),
      buyersOwing: new Set(all.filter((b) => b.outstandingPkr > 0).map((b) => b.buyer.id)).size,
      overduePkr: sum(overdue, "nextAmountPkr"),
      overdueCount: overdue.length,
      dueTodayCount: today_.length,
    },
    projects: [...new Map(all.map((b) => [b.project.id, b.project])).values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function filterDesk(all: DeskBooking[], tab: DeskTab, q?: string, projectId?: string) {
  const term = q?.trim().toLowerCase();
  return all.filter(
    (b) =>
      (tab === "all" ||
        (tab === "overdue" && b.daysUntil !== null && b.daysUntil < 0) ||
        (tab === "today" && b.daysUntil === 0) ||
        (tab === "paid" && b.outstandingPkr === 0)) &&
      (!projectId || b.project.id === projectId) &&
      (!term || [b.buyer.name, b.property, b.project.name].some((s) => s.toLowerCase().includes(term))),
  );
}
