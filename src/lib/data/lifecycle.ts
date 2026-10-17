/**
 * Archive / restore / delete for records that other records depend on (PROJECT_SPEC §42: prefer archive
 * where deleting would break history). Every delete re-checks its blockers inside the transaction, so a
 * booking or payment added between page load and click can never be orphaned.
 */
import { prisma } from "../db";

export class LifecycleError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/* ---------- Projects ---------- */

export async function projectBlockers(id: string) {
  const c = await prisma.project.findUnique({
    where: { id },
    select: { _count: { select: { properties: true, bookings: true, documents: true, investments: true } } },
  });
  return c?._count ?? null;
}

export async function setProjectArchived(id: string, archived: boolean) {
  const before = await prisma.project.findUnique({ where: { id } });
  if (!before) throw new LifecycleError("missing");
  // Archiving also unpublishes; restoring leaves it unpublished so the admin re-checks it before it goes live again.
  const after = await prisma.project.update({
    where: { id },
    data: archived ? { archivedAt: new Date(), published: false, featured: false } : { archivedAt: null },
  });
  return { before, after };
}

export async function deleteProject(id: string) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.project.findUnique({
      where: { id },
      include: { _count: { select: { properties: true, bookings: true, documents: true, investments: true } } },
    });
    if (!p) throw new LifecycleError("missing");
    const { properties, bookings, documents, investments } = p._count;
    if (properties + bookings + documents + investments > 0) throw new LifecycleError("in-use");
    // Stages and list items cascade; leads keep their record with the project link cleared.
    await tx.project.delete({ where: { id } });
    const { _count, ...before } = p;
    void _count;
    return before;
  });
}

/* ---------- Properties ---------- */

export async function propertyBlockers(id: string) {
  const p = await prisma.property.findUnique({
    where: { id },
    select: { status: true, _count: { select: { bookings: true } }, bookings: { where: { status: { not: "Cancelled" } }, select: { id: true } } },
  });
  return p ? { bookings: p._count.bookings, activeBooking: p.bookings[0]?.id ?? null, status: p.status } : null;
}

export async function setPropertyArchived(id: string, archived: boolean) {
  const before = await prisma.property.findUnique({
    where: { id },
    include: { bookings: { where: { status: { not: "Cancelled" } }, select: { id: true } } },
  });
  if (!before) throw new LifecycleError("missing");
  // A unit still being paid for must stay visible to staff; sold (fully handed over) or available units can go.
  if (archived && before.status === "Booked" && before.bookings.length > 0) throw new LifecycleError("booked");
  const after = await prisma.property.update({
    where: { id },
    data: archived ? { archivedAt: new Date(), published: false } : { archivedAt: null },
  });
  const { bookings, ...rest } = before;
  void bookings;
  return { before: rest, after };
}

export async function deleteProperty(id: string) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.property.findUnique({ where: { id }, include: { _count: { select: { bookings: true } } } });
    if (!p) throw new LifecycleError("missing");
    // Any booking, even a cancelled one, is financial history tied to this unit.
    if (p._count.bookings > 0) throw new LifecycleError("in-use");
    await tx.property.delete({ where: { id } });
    const { _count, ...before } = p;
    void _count;
    return before;
  });
}

/* ---------- Investment opportunities ---------- */

export async function setInvestmentArchived(id: string, archived: boolean) {
  const before = await prisma.investmentOpportunity.findUnique({ where: { id } });
  if (!before) throw new LifecycleError("missing");
  const after = await prisma.investmentOpportunity.update({
    where: { id },
    data: archived ? { archivedAt: new Date(), published: false } : { archivedAt: null },
  });
  return { before, after };
}

export async function deleteInvestment(id: string) {
  return prisma.$transaction(async (tx) => {
    const i = await tx.investmentOpportunity.findUnique({ where: { id }, include: { _count: { select: { leads: true } } } });
    if (!i) throw new LifecycleError("missing");
    // Investors who registered interest are leads the sales team still follows up.
    if (i._count.leads > 0) throw new LifecycleError("in-use");
    await tx.investmentOpportunity.delete({ where: { id } });
    const { _count, ...before } = i;
    void _count;
    return before;
  });
}

/* ---------- Customers ---------- */

export async function customerBlockers(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: { role: true, _count: { select: { bookings: true, payments: true, documents: true } } },
  });
  return u && u.role === "buyer" ? u._count : null;
}

export async function deleteCustomer(id: string) {
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true, payments: true, documents: true } } },
    });
    if (!u || u.role !== "buyer") throw new LifecycleError("missing");
    if (u._count.bookings + u._count.payments + u._count.documents > 0) throw new LifecycleError("in-use");
    await tx.user.delete({ where: { id } });
    // Never return the password hash to callers (it would end up in the audit log).
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, city: u.city, cnic: u.cnic };
  });
}

/* ---------- Leads and documents ---------- */

export async function deleteLead(id: string) {
  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) throw new LifecycleError("missing");
  await prisma.lead.delete({ where: { id } });
  return before;
}

export async function deleteDocumentRecord(id: string) {
  const before = await prisma.document.findUnique({ where: { id } });
  if (!before) throw new LifecycleError("missing");
  await prisma.document.delete({ where: { id } });
  return before;
}

export async function investmentLeadCount(id: string) {
  return prisma.lead.count({ where: { investmentId: id } });
}

/** Every document (public and buyer-private) for Admin → Documents, newest first. */
export async function getDocumentRowsForAdmin() {
  return prisma.document.findMany({
    orderBy: [{ issuedOn: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      audience: true,
      category: true,
      issuedOn: true,
      storagePath: true,
      user: { select: { id: true, name: true } },
      project: { select: { name: true } },
    },
  });
}
