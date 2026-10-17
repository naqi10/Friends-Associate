import {
  getBookingsForUserDetailed,
  getCompany,
  getDocumentsForUser,
  getProjectsFiltered,
  getPaymentsForUser,
  getPropertiesWithProject,
} from "@/lib/data";
import { formatDate, formatPkr, receiptLabel } from "./format";
import type { User } from "./types";
import type { Can } from "./permissions";

/**
 * Rule-based assistant. `can` is the caller's permission checker: private answers are only produced
 * when the buyer's role is allowed to see that data, and only ever from the buyer's own records.
 */
export async function runHelpChat(message: string, user: User | null, can: Can): Promise<string> {
  const text = message.trim().toLowerCase();
  if (!text) {
    return greeting(user);
  }

  if (!user) {
    if (text.includes("login") || text.includes("payment status") || text.includes("my ")) {
      return "Please log in to view your booking, payments and documents. Use the Login link above.";
    }
    if (text.includes("project") || text.includes("available")) {
      const [available, projects] = await Promise.all([
        getPropertiesWithProject({ status: "Available", publishedOnly: true }, 10),
        getProjectsFiltered({ publishedOnly: true }),
      ]);
      const projectsList = projects.map((p) => `• ${p.name} (${p.city}) — ${p.status}`).join("\n");
      const units =
        available.length > 0
          ? available.map((p) => `• ${p.title} — ${formatPkr(p.price_pkr)}`).join("\n")
          : "No units marked Available right now.";
      return `Our projects:\n${projectsList}\n\nAvailable units:\n${units}`;
    }
    if (text.includes("contact") || text.includes("sales")) {
      const company = await getCompany();
      return `Contact Friends Associates: ${company.email} | WhatsApp ${company.whatsapp}`;
    }
    return `${greeting(user)}\n\nAsk about projects, available properties, or contact details.`;
  }

  if (user.role === "buyer") {
    // Authorization happens here: only this buyer's own bookings are ever loaded.
    const bookings = (await getBookingsForUserDetailed(user.id)).filter((b) => b.status !== "Cancelled");
    if (can("payments", "view") && /receipt|raseed|rasid|رسید/.test(text)) {
      const receipts = (await getPaymentsForUser(user.id)).filter((p) => p.status === "received").slice(0, 5);
      if (receipts.length === 0) return "No payment receipts on file yet. See Payments in your portal.";
      const lines = receipts.map((p) => `• ${receiptLabel(p.receiptNo)}: ${formatPkr(p.amountPkr)} on ${formatDate(p.paidOn)} (${p.method})`);
      return `Your latest receipts:\n${lines.join("\n")}\n\nOpen Payments in your portal to view or print any receipt.`;
    }
    if (
      can("payments", "view") &&
      (text.includes("payment") ||
        text.includes("owe") ||
        text.includes("outstanding") ||
        text.includes("next"))
    ) {
      if (bookings.length === 0) return "You have no bookings on file.";
      return bookings
        .map(
          (b) =>
            `${b.property.title}: Paid ${formatPkr(b.paid_pkr)}, outstanding ${formatPkr(b.outstanding_pkr)}, next ${formatDate(b.next_payment_date)} — ${formatPkr(b.next_payment_amount_pkr)}`,
        )
        .join("\n");
    }
    if (text.includes("document") && can("documents", "view")) {
      const docs = await getDocumentsForUser(user.id);
      return docs.map((d) => `• ${d.name} (${d.status})`).join("\n") || "No documents.";
    }
    if ((text.includes("progress") || text.includes("construction")) && can("progress", "view")) {
      if (bookings.length === 0) return "You have no bookings on file.";
      const projects = new Map(bookings.map((b) => [b.project.id, b.project]));
      return [...projects.values()].map((p) => `${p.name}: ${p.progress_percent}% — ${p.status}`).join("\n");
    }
  }

  return greeting(user) + "\n\nHow may I help you regarding Friends Associates projects or your account?";
}

function greeting(user: User | null): string {
  if (user?.role === "buyer") {
    return `Assalam-o-Alaikum, ${user.name}. Welcome to your Friends Associates customer portal.`;
  }
  return "How are you, Sir? How may I help you today?";
}
