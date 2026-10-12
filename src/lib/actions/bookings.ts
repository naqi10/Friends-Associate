"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BookingRuleError,
  createBooking,
  getBooking,
  recordBookingPayment,
  updateBooking,
  writeAuditLog,
} from "@/lib/data";
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
  if (e instanceof BookingRuleError) return e.code === "buyer" ? "booking-buyer" : e.code;
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "property";
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
  const back = (code: string) => redirect(`/admin/bookings/new?buyer=${encodeURIComponent(userId)}&error=${code}`);

  if (!userId || !propertyId) back("required");
  if (!validDate(bookedOn)) back("date");
  const { values, error } = readSchedule(formData);
  if (error || !values) return back(error ?? "number");
  // An opening paid amount is a money figure: it needs payment rights, not just booking rights.
  if (values.paidPkr > 0 && !can("payments", "add")) return back("payments-permission");

  let bookingId = "";
  let failure = "";
  try {
    const booking = await createBooking({ userId, propertyId, bookedOn, ...values });
    bookingId = booking.id;
    await writeAuditLog({ userId: actor.id, action: "create", module: "bookings", recordId: booking.id, newValue: booking });
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
  const back = (code: string) => redirect(`/admin/bookings/${id}?error=${code}`);

  const { values, error } = readSchedule(formData);
  if (error || !values) return back(error ?? "number");
  const propertyStatus = text(formData, "property_status") === "Sold" ? "Sold" : "Booked";
  const current = await getBooking(id);
  if (!current) return back("missing");
  // Schedule edits need bookings:update; changing the paid amount additionally needs payments:update.
  if (values.paidPkr !== current.paidPkr && !can("payments", "update")) return back("payments-permission");

  let failure = "";
  let userId = "";
  try {
    const { before, after } = await updateBooking(id, { ...values, propertyStatus });
    userId = after.userId;
    await writeAuditLog({ userId: actor.id, action: "update", module: "bookings", recordId: id, oldValue: before, newValue: { ...after, propertyStatus } });
  } catch (e) {
    failure = ruleCode(e);
  }
  if (failure) back(failure);

  revalidateBookingViews(userId);
  redirect(`/admin/bookings/${id}?saved=updated`);
}

export async function recordPaymentAction(formData: FormData) {
  const { user: actor } = await requireStaff("payments", "add");
  const id = text(formData, "id");
  const back = (code: string) => redirect(`/admin/bookings/${id}?error=${code}`);
  const amount = wholeNumber(formData, "amount_pkr");
  if (!amount) back("amount");

  let failure = "";
  let userId = "";
  try {
    const { before, after } = await recordBookingPayment(id, amount!);
    userId = after.userId;
    await writeAuditLog({
      userId: actor.id,
      action: "record-payment",
      module: "payments",
      recordId: id,
      oldValue: { paidPkr: before.paidPkr, outstandingPkr: before.outstandingPkr },
      newValue: { amountPkr: amount, paidPkr: after.paidPkr, outstandingPkr: after.outstandingPkr, method: text(formData, "method") },
    });
  } catch (e) {
    failure = ruleCode(e);
  }
  if (failure) back(failure);

  revalidateBookingViews(userId);
  redirect(`/admin/bookings/${id}?saved=payment`);
}
