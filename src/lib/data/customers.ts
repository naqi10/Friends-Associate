import { prisma } from "../db";

/** Fields safe to send to admin screens. Never includes the password hash. */
const customerSelect = {
  id: true,
  name: true,
  email: true,
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
    email: u.email,
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

export async function emailInUse(email: string, excludeId?: string) {
  const row = await prisma.user.findFirst({
    where: { email, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return !!row;
}

export async function createCustomer(data: {
  name: string;
  email: string;
  phone: string;
  city: string;
  cnic: string;
  passwordHash: string;
}) {
  return prisma.user.create({ data: { ...data, role: "buyer" }, select: { id: true } });
}

export async function updateCustomer(
  id: string,
  data: Partial<{ name: string; email: string; phone: string; city: string; cnic: string; active: boolean; documentDownloadPaidAt: Date | null; passwordHash: string }>,
) {
  return prisma.user.update({ where: { id }, data, select: customerSelect });
}
