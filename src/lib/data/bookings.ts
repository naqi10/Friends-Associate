import { prisma } from "../db";

export const MAX_BOOKINGS_PER_BUYER = 10;

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
    where: { status: "Available", booking: null, projectId: { not: null }, listingType: "sale" },
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
      select: { role: true, active: true, _count: { select: { bookings: true } } },
    });
    if (!buyer || buyer.role !== "buyer" || !buyer.active) throw new BookingRuleError("buyer");
    if (buyer._count.bookings >= MAX_BOOKINGS_PER_BUYER) throw new BookingRuleError("limit");

    const property = await tx.property.findUnique({
      where: { id: input.propertyId },
      select: { status: true, pricePkr: true, projectId: true, booking: { select: { id: true } } },
    });
    if (!property || property.status !== "Available" || property.booking) throw new BookingRuleError("property");
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

/** Records one received instalment: moves money from outstanding to paid and advances the counters. */
export async function recordBookingPayment(id: string, amountPkr: number) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({ where: { id } });
    if (!current) throw new BookingRuleError("missing");
    if (amountPkr <= 0 || amountPkr > current.outstandingPkr) throw new BookingRuleError("amount");
    const updated = await tx.booking.update({
      where: { id },
      data: {
        paidPkr: current.paidPkr + amountPkr,
        outstandingPkr: current.outstandingPkr - amountPkr,
        paymentsReceived: current.paymentsReceived + 1,
        paymentsRemaining: Math.max(0, current.paymentsRemaining - 1),
      },
    });
    return { before: current, after: updated };
  });
}
