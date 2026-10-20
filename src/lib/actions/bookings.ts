"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BookingRuleError,
  createBooking,
  getBooking,
  createDocumentRecord,
  lastPaymentReminder,
  notifyUser,
  recordBookingPayment,
  reverseBookingPayment,
  updateBooking,
  writeAuditLog,
} from "@/lib/data";
import { prisma } from "@/lib/db";
import { saveDocumentFile } from "@/lib/files";
import { contentTypeFor } from "@/lib/storage";
import { PAYMENT_METHODS } from "@/lib/catalog";
import { formatDate, formatPkr, receiptLabel, todayPk } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function wholeNumber(formData: FormData, key: string): number | null {
  const raw = text(formData, key).replace(/,/g, "");
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

function validDate(value: string) {
  return DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

/** Maps data-layer rule failures to form error codes; anything unexpected is rethrown. */
function ruleCode(e: unknown): string {
  if (e instanceof BookingRuleError)
    return e.code === "buyer" ? "booking-buyer" : e.code;
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    return "property";
  throw e;
}

function revalidateBookingViews(userId?: string) {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/properties");
  revalidatePath("/portal", "layout");
  if (userId) revalidatePath(`/admin/customers/${userId}`);
}

function readSchedule(formData: FormData) {
  const values = {
    status: text(formData, "status") || "Instalments in progress",
    paidPkr: wholeNumber(formData, "paid_pkr"),
    paymentsReceived: wholeNumber(formData, "payments_received"),
    paymentsRemaining: wholeNumber(formData, "payments_remaining"),
    nextPaymentDate: text(formData, "next_payment_date"),
    nextPaymentAmountPkr: wholeNumber(formData, "next_payment_amount_pkr"),
  };
  if (
    values.paidPkr === null ||
    values.paymentsReceived === null ||
    values.paymentsRemaining === null ||
    values.nextPaymentAmountPkr === null
  ) {
    return { error: "number" as const };
  }
  if (!validDate(values.nextPaymentDate)) return { error: "date" as const };
  return {
    values: {
      ...values,
      paidPkr: values.paidPkr,
      paymentsReceived: values.paymentsReceived,
      paymentsRemaining: values.paymentsRemaining,
      nextPaymentAmountPkr: values.nextPaymentAmountPkr,
    },
  };
}

export async function createBookingAction(formData: FormData) {
  const { user: actor, can } = await requireStaff("bookings", "add");
  const userId = text(formData, "user_id");
  const propertyId = text(formData, "property_id");
  const bookedOn = text(formData, "booked_on");
  const back = (code: string) =>
    redirect(
      `/admin/bookings/new?buyer=${encodeURIComponent(userId)}&error=${code}`,
    );

  if (!userId || !propertyId) back("required");
  if (!validDate(bookedOn)) back("date");
  const { values, error } = readSchedule(formData);
  if (error || !values) return back(error ?? "number");
  // An opening paid amount is a money figure: it needs payment rights, not just booking rights.
  if (values.paidPkr > 0 && !can("payments", "add"))
    return back("payments-permission");

  let bookingId = "";
  let failure = "";
  try {
    const booking = await createBooking({
      userId,
      propertyId,
      bookedOn,
      ...values,
    });
    bookingId = booking.id;
    await writeAuditLog({
      userId: actor.id,
      action: "create",
      module: "bookings",
      recordId: booking.id,
      newValue: booking,
    });
  } catch (e) {
    failure = ruleCode(e);
  }
  if (failure) back(failure);

  revalidateBookingViews(userId);
  redirect(`/admin/bookings/${bookingId}?saved=created`);
}

export async function updateBookingAction(formData: FormData) {
  const { user: actor, can } = await requireStaff("bookings", "update");
  const id = text(formData, "id");
  const back = (code: string) =>
    redirect(`/admin/bookings/${id}?error=${code}`);

  const { values, error } = readSchedule(formData);
  if (error || !values) return back(error ?? "number");
  const propertyStatus =
    text(formData, "property_status") === "Sold" ? "Sold" : "Booked";
  const current = await getBooking(id);
  if (!current) return back("missing");
  // Schedule edits need bookings:update; changing the paid amount additionally needs payments:update.
  if (values.paidPkr !== current.paidPkr && !can("payments", "update"))
    return back("payments-permission");

  let failure = "";
  let userId = "";
  try {
    const { before, after } = await updateBooking(id, {
      ...values,
      propertyStatus,
    });
    userId = after.userId;
    await writeAuditLog({
      userId: actor.id,
      action: "update",
      module: "bookings",
      recordId: id,
      oldValue: before,
      newValue: { ...after, propertyStatus },
    });
  } catch (e) {
    failure = ruleCode(e);
  }
  if (failure) back(failure);

  revalidateBookingViews(userId);
  redirect(`/admin/bookings/${id}?saved=updated`);
}

const RECEIPT_EXT = /\.(pdf|jpe?g|png|webp)$/i;
const MAX_RECEIPT_BYTES = 15 * 1024 * 1024;

/** Back to the Bookings & payments desk (with its filters) when the form came from there. */
function deskReturn(formData: FormData) {
  const r = text(formData, "return");
  return /^\/admin\/bookings(\?[A-Za-z0-9_\-=&.%+]*)?$/.test(r) ? r : null;
}
const withParam = (url: string, param: string) =>
  `${url}${url.includes("?") ? "&" : "?"}${param}`;

export async function recordPaymentAction(formData: FormData) {
  const { user: actor } = await requireStaff("payments", "add");
  const id = text(formData, "id");
  const desk = deskReturn(formData);
  const back = (code: string) =>
    redirect(
      desk
        ? withParam(desk, `error=${code}`)
        : `/admin/bookings/${id}?error=${code}`,
    );
  const receipt = formData.get("receipt_file");
  const receiptFile =
    receipt instanceof File && receipt.size > 0 ? receipt : null;
  if (receiptFile && receiptFile.size > MAX_RECEIPT_BYTES) back("size");
  if (receiptFile && !RECEIPT_EXT.test(receiptFile.name)) back("receipt-type");
  const amount = wholeNumber(formData, "amount_pkr");
  if (!amount) back("amount");
  const paidOn = text(formData, "paid_on");
  if (!validDate(paidOn) || paidOn > todayPk()) back("payment-date");
  const method = text(formData, "method");
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) back("method");
  const referenceNumber = text(formData, "reference_number").slice(0, 80);
  // A bank transfer or cheque without its reference cannot be traced back to the bank statement.
  if ((method === "Bank Transfer" || method === "Cheque") && !referenceNumber)
    back("reference");
  const remarks = text(formData, "remarks").slice(0, 500);

  let failure = "";
  let userId = "";
  let paymentId = "";
  try {
    const { before, after, payment } = await recordBookingPayment(id, {
      amountPkr: amount!,
      paidOn,
      method,
      referenceNumber,
      remarks,
      createdById: actor.id,
    });
    userId = after.userId;
    paymentId = payment.id;
    await writeAuditLog({
      userId: actor.id,
      action: "record-payment",
      module: "payments",
      recordId: payment.id,
      oldValue: {
        bookingId: id,
        paidPkr: before.paidPkr,
        outstandingPkr: before.outstandingPkr,
      },
      newValue: {
        receipt: receiptLabel(payment.receiptNo),
        amountPkr: amount,
        paidOn,
        method,
        referenceNumber,
        paidPkr: after.paidPkr,
        outstandingPkr: after.outstandingPkr,
      },
    });
  } catch (e) {
    failure = ruleCode(e);
  }
  if (failure) back(failure);

  // The buyer's bank slip / cheque photo is kept as their private document and linked to the receipt.
  let receiptStored = true;
  if (receiptFile && paymentId) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { receiptNo: true, booking: { select: { projectId: true } } },
      });
      const { storagePath, fileName } = await saveDocumentFile(
        "buyer",
        receiptFile.name,
        Buffer.from(await receiptFile.arrayBuffer()),
        contentTypeFor(receiptFile.name),
      );
      const doc = await createDocumentRecord({
        audience: "buyer",
        userId,
        projectId: payment?.booking.projectId ?? null,
        name: `Payment proof ${payment ? receiptLabel(payment.receiptNo) : ""}`.trim(),
        category: "Payment receipt",
        issuedOn: text(formData, "paid_on") || todayPk(),
        fileName,
        storagePath,
      });
      await prisma.payment.update({
        where: { id: paymentId },
        data: { receiptDocumentId: doc.id },
      });
      await writeAuditLog({
        userId: actor.id,
        action: "upload",
        module: "documents",
        recordId: doc.id,
        newValue: { name: doc.name, paymentId },
      });
    } catch (e) {
      // The payment is already safely recorded; only the attachment failed (e.g. no file storage on the server).
      console.error("Receipt upload failed", e);
      receiptStored = false;
    }
  }
  await notifyUser(userId, {
    type: "payment_received",
    title: `Payment received: ${formatPkr(amount!)}`,
    message: `Thank you. Your payment of ${formatPkr(amount!)} dated ${formatDate(paidOn)} has been recorded. You can print the receipt from Payments.`,
    link: `/portal/receipts/${paymentId}`,
  });

  revalidateBookingViews(userId);
  const done = `saved=payment&receipt=${paymentId}${receiptStored ? "" : "&warn=receipt"}`;
  redirect(desk ? withParam(desk, done) : `/admin/bookings/${id}?${done}`);
}

/** Portal reminder for the next instalment. At most one per booking per day. */
export async function sendPaymentReminderAction(formData: FormData) {
  const { user: actor } = await requireStaff("bookings", "update");
  const id = text(formData, "id");
  const desk = deskReturn(formData) ?? "/admin/bookings";
  const b = await getBooking(id);
  if (!b || b.status === "Cancelled" || b.outstandingPkr <= 0)
    redirect(withParam(desk, "error=reminder"));
  const last = await lastPaymentReminder(b!.user.id, b!.id);
  if (last && Date.now() - last.getTime() < 24 * 3600 * 1000)
    redirect(withParam(desk, "error=reminder-sent"));
  const amount = Math.min(b!.nextPaymentAmountPkr, b!.outstandingPkr);
  const overdue = b!.nextPaymentDate < todayPk();
  await notifyUser(b!.user.id, {
    type: "payment_due",
    title: overdue
      ? `Instalment overdue: ${formatPkr(amount)}`
      : `Instalment due ${formatDate(b!.nextPaymentDate)}`,
    message: `Your instalment of ${formatPkr(amount)} for ${b!.property.title} ${overdue ? "was" : "is"} due on ${formatDate(b!.nextPaymentDate)}. If you have already paid, please share the bank reference with our office.`,
    link: `/portal/payments#b-${b!.id}`,
  });
  await writeAuditLog({
    userId: actor.id,
    action: "reminder",
    module: "bookings",
    recordId: id,
    newValue: {
      buyer: b!.user.name,
      amountPkr: amount,
      due: b!.nextPaymentDate,
    },
  });
  redirect(withParam(desk, "saved=reminded"));
}

/** Reversing needs Payments → Edit: it changes money figures that were already confirmed to the buyer. */
export async function reversePaymentAction(formData: FormData) {
  const { user: actor } = await requireStaff("payments", "update");
  const bookingId = text(formData, "booking_id");
  const paymentId = text(formData, "payment_id");
  const back = (code: string) =>
    redirect(`/admin/bookings/${bookingId}?error=${code}`);
  const reason = text(formData, "reason").slice(0, 300);
  if (reason.length < 5) back("reversal-reason");

  let failure = "";
  let userId = "";
  try {
    const { payment, before, after } = await reverseBookingPayment(
      paymentId,
      actor.id,
      reason,
    );
    if (payment.bookingId !== bookingId) throw new BookingRuleError("missing");
    userId = after.userId;
    await writeAuditLog({
      userId: actor.id,
      action: "reverse-payment",
      module: "payments",
      recordId: paymentId,
      oldValue: {
        receipt: receiptLabel(payment.receiptNo),
        status: "received",
        paidPkr: before.paidPkr,
        outstandingPkr: before.outstandingPkr,
      },
      newValue: {
        status: "reversed",
        reason,
        paidPkr: after.paidPkr,
        outstandingPkr: after.outstandingPkr,
      },
    });
  } catch (e) {
    failure = ruleCode(e);
  }
  if (failure) back(failure);

  revalidateBookingViews(userId);
  redirect(`/admin/bookings/${bookingId}?saved=reversed`);
}
