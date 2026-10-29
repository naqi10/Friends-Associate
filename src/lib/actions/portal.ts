"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { createDocumentRecord, createLead, getBookingsForUserDetailed, writeAuditLog } from "@/lib/data";
import { CUSTOMER_PROOF_PREFIX as PROOF_PREFIX, PROOF_FILE_EXT } from "@/lib/document-access";
import { withParam } from "@/lib/documents-return";
import { sendNewLeadEmails } from "@/lib/email";
import { saveDocumentFile } from "@/lib/files";
import { formatPkr, todayPk } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { absoluteUrl } from "@/lib/seo";
import { contentTypeFor } from "@/lib/storage";

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const MAX_PROOFS_PER_DAY = 5;

/** Requests a customer can make from the portal. Each becomes a lead on the Sales desk (source "Customer portal"). */
const REQUESTS = {
  callback: { interest: "Callback request (customer)", note: "Asked for a call back from the customer portal." },
} as const;

/** Only pages of the portal itself. */
function portalReturn(formData: FormData, fallback: string) {
  const raw = String(formData.get("return") ?? "");
  return /^\/portal(\/[a-z-]*)?$/.test(raw) ? raw : fallback;
}

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

async function staffLead(
  user: { id: string; name: string; phone: string; email: string; city: string },
  interest: string,
  message: string,
  details: Record<string, unknown>,
  ids: { propertyId?: string; projectId?: string } = {},
) {
  const lead = {
    name: user.name,
    phone: user.phone,
    email: user.email,
    city: user.city,
    interest,
    source: "portal" as const,
    message,
    details: { ...details, "Customer page": absoluteUrl(`/admin/customers/${user.id}`) },
    propertyId: ids.propertyId ?? null,
    projectId: ids.projectId ?? null,
  };
  const row = await createLead(lead);
  // The customer already sees the confirmation in the portal; only the office gets an email.
  after(() => sendNewLeadEmails({ ...lead, id: row.id }, { confirm: false }));
  revalidatePath("/sales");
}

/** "Request a callback". Asking twice within a day does not create a second lead. */
export async function portalRequestAction(formData: FormData) {
  const user = await requireUser(["buyer"]);
  const kind = text(formData, "kind", 20) as keyof typeof REQUESTS;
  const back = portalReturn(formData, "/portal");
  const req = REQUESTS[kind];
  if (!req) redirect(back);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.lead.findFirst({
    where: { source: "portal", email: user.email, interest: req.interest, createdAt: { gte: since } },
    select: { id: true },
  });
  if (!recent) {
    const when = text(formData, "preferred_time", 40);
    await staffLead(user, req.interest, req.note, when ? { "Best time to call": when } : {});
  }
  redirect(withParam(back, `sent=${kind}`));
}

/** "I've paid": the customer sends a bank slip or cheque photo. Staff check it and record the payment. */
export async function sendPaymentProofAction(formData: FormData) {
  const user = await requireUser(["buyer"]);
  const back = "/portal/payments";
  const fail = (code: string): never => redirect(`${back}?error=${code}#send-receipt`);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) fail("required");
  const proof = file as File;
  if (proof.size > MAX_PROOF_BYTES) fail("size");
  if (!PROOF_FILE_EXT.test(proof.name)) fail("receipt-type");

  const bookings = (await getBookingsForUserDetailed(user.id)).filter((b) => b.status !== "Cancelled");
  // Only one of the customer's own bookings can be chosen; with one booking it is picked automatically.
  const booking = bookings.find((b) => b.id === text(formData, "booking_id", 60)) ?? (bookings.length === 1 ? bookings[0] : undefined);
  if (!booking) fail("required");

  const amountRaw = text(formData, "amount", 15).replace(/[,\s]/g, "");
  const amount = amountRaw ? Number(amountRaw) : 0;
  if (amountRaw && (!/^\d+$/.test(amountRaw) || amount <= 0)) fail("amount");
  const today = todayPk();
  const paidOn = text(formData, "paid_on", 10) || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > today) fail("payment-date");

  const sentToday = await prisma.document.count({
    where: { userId: user.id, audience: "buyer", name: { startsWith: PROOF_PREFIX }, issuedOn: today },
  });
  if (sentToday >= MAX_PROOFS_PER_DAY) fail("too-many");

  let stored: { storagePath: string; fileName: string };
  try {
    stored = await saveDocumentFile("buyer", proof.name, Buffer.from(await proof.arrayBuffer()), contentTypeFor(proof.name));
  } catch (e) {
    console.error("[portal] payment proof upload failed:", e instanceof Error ? e.message : e);
    return fail("storage");
  }
  const doc = await createDocumentRecord({
    audience: "buyer",
    userId: user.id,
    projectId: booking!.project.id,
    name: `${PROOF_PREFIX} · ${booking!.property.title}`.slice(0, 160),
    category: "Payment Receipt",
    issuedOn: today,
    status: "Pending",
    ...stored,
  });
  await writeAuditLog({
    userId: user.id,
    action: "upload",
    module: "documents",
    recordId: doc.id,
    newValue: { name: doc.name, bookingId: booking!.id, amountPkr: amount || null, paidOn, sizeBytes: proof.size },
  });
  await staffLead(
    user,
    `Payment proof: ${booking!.property.title}`.slice(0, 150),
    `The customer sent a payment proof from the portal. Check it, then record the payment on the booking.`,
    {
      Property: booking!.property.title,
      "Amount (as told by customer)": amount ? formatPkr(amount) : "Not given",
      "Paid on": paidOn,
      "Booking page": absoluteUrl(`/admin/bookings/${booking!.id}`),
    },
    { propertyId: booking!.property.id, projectId: booking!.project.id },
  );
  revalidatePath("/portal/documents");
  redirect(`${back}?sent=receipt#send-receipt`);
}
