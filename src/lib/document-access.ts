/**
 * When a customer sees and downloads their files:
 *   - a naqsha / design client (no property booking at all): always, as soon as staff upload them;
 *   - a property buyer: once confirmed, i.e. an active booking with at least one payment received.
 */
export function documentsVisible(bookings: { status: string; paid_pkr: number }[]): boolean {
  return bookings.length === 0 || bookings.some((b) => b.status !== "Cancelled" && b.paid_pkr > 0);
}

/** Files staff can give a customer: drawings (PDF, DWG), photos and ZIP archives. */
export const BUYER_FILE_EXT = /\.(pdf|dwg|jpe?g|png|webp|zip)$/i;
export const BUYER_FILE_ACCEPT = ".pdf,.dwg,.jpg,.jpeg,.png,.webp,.zip";
/** Largest customer file; big ones go straight to the storage bucket, not through the app. */
export const BUYER_FILE_MAX_BYTES = 200 * 1024 * 1024;

/** Payment slips and receipts (sent by the customer, or attached by staff to a payment): PDF or a photo. */
export const PROOF_FILE_EXT = /\.(pdf|jpe?g|png)$/i;

/** Name prefix of a payment proof the customer sent from the portal ("I've paid"). */
export const CUSTOMER_PROOF_PREFIX = "Payment proof sent by you";

/** A file the customer sent us, still waiting for staff to check it. */
export function isCustomerProof(doc: { name: string; status?: string | null }) {
  return doc.name.startsWith(CUSTOMER_PROOF_PREFIX) && doc.status === "Pending";
}
