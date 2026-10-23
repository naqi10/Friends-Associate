"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { sendNewLeadEmails } from "@/lib/email";
import { redirect } from "next/navigation";
import {
  createLead,
  getInvestmentById,
  getLead,
  getPropertyById,
  updateLead,
  writeAuditLog,
  type NewLead,
} from "@/lib/data";
import { LEAD_STATUSES, PROPERTY_TYPES, isKey } from "@/lib/catalog";
import { requireStaff } from "@/lib/permissions";
import { allowPublicSubmission, clientIp } from "@/lib/public-guard";

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Same-site path to send the visitor back to; anything else falls back to the given default. */
function safeReturn(formData: FormData, fallback: string) {
  const r = text(formData, "returnTo", 200);
  return /^\/(?![/\\])[A-Za-z0-9/_\-?=&.%]*$/.test(r) ? r : fallback;
}

function withParam(path: string, param: string) {
  const [base, hash] = path.split("#");
  return `${base}${base.includes("?") ? "&" : "?"}${param}${hash ? `#${hash}` : ""}`;
}

/**
 * Shared guard for every public form: honeypot, per-IP rate limit, required name + valid phone.
 * Returns the cleaned contact fields, or redirects back with an error code.
 */
async function guardPublicForm(formData: FormData, returnTo: string) {
  const back = (code: string) => redirect(withParam(returnTo, `error=${code}`) + "#enquiry");
  // Bots fill every field; people never see this one. Pretend success so bots learn nothing.
  if (text(formData, "website")) redirect(withParam(returnTo, "sent=1") + "#enquiry");

  const ip = clientIp(await headers());

  const name = text(formData, "name", 120);
  const phone = text(formData, "phone", 30);
  const email = text(formData, "email", 200).toLowerCase();
  if (name.length < 2) back("required");
  if (!PHONE_RE.test(phone)) back("phone");
  if (email && !EMAIL_RE.test(email)) back("email");

  if (!(await allowPublicSubmission(ip))) back("rate-limit");
  return { name, phone, email, city: text(formData, "city", 60) };
}

async function submit(lead: NewLead, returnTo: string) {
  const row = await createLead(lead);
  // Office alert + client confirmation, sent after the response so a slow email never delays the visitor.
  after(() => sendNewLeadEmails({ ...lead, id: row.id }));
  revalidatePath("/sales");
  redirect(withParam(returnTo, "sent=1") + "#enquiry");
}

export async function contactAction(formData: FormData) {
  const returnTo = safeReturn(formData, "/contact");
  const contact = await guardPublicForm(formData, returnTo);
  const message = text(formData, "message", 2000);
  if (!message) redirect(withParam(returnTo, "error=required") + "#enquiry");
  await submit(
    { ...contact, source: "contact", interest: text(formData, "service", 120) || "Website enquiry", service: text(formData, "service", 120), message },
    returnTo,
  );
}

export async function requestCallbackAction(formData: FormData) {
  const returnTo = safeReturn(formData, "/contact");
  const contact = await guardPublicForm(formData, returnTo);
  const propertyId = text(formData, "propertyId", 60) || null;
  const projectId = text(formData, "projectId", 60) || null;
  const property = propertyId ? await getPropertyById(propertyId) : undefined;
  await submit(
    {
      ...contact,
      source: "callback",
      interest: text(formData, "interest", 150) || property?.title || "Callback request",
      message: text(formData, "message", 1000),
      details: { preferredTime: text(formData, "preferred_time", 40) },
      propertyId: property ? property.id : null,
      projectId,
    },
    returnTo,
  );
}

export async function sellPropertyAction(formData: FormData) {
  const returnTo = safeReturn(formData, "/properties?tab=sell");
  const contact = await guardPublicForm(formData, returnTo);
  const type = text(formData, "property_type", 40);
  const size = text(formData, "size", 60);
  const locality = text(formData, "locality", 120);
  if (!(PROPERTY_TYPES as readonly string[]).includes(type) || !size || !locality) {
    redirect(withParam(returnTo, "error=required") + "#enquiry");
  }
  await submit(
    {
      ...contact,
      source: "sell",
      interest: `Sell: ${size} ${type}, ${locality}`,
      service: "Property selling",
      location: locality,
      size,
      budget: text(formData, "expected_price", 60),
      message: text(formData, "message", 1000),
      details: { purpose: text(formData, "purpose", 20) || "sell" },
    },
    returnTo,
  );
}

export async function investmentInterestAction(formData: FormData) {
  const returnTo = safeReturn(formData, "/investment");
  const contact = await guardPublicForm(formData, returnTo);
  const investment = await getInvestmentById(text(formData, "investmentId", 60));
  if (!investment || !investment.published || investment.status !== "open") {
    redirect(withParam(returnTo, "error=investment") + "#enquiry");
  }
  await submit(
    {
      ...contact,
      source: "investment",
      interest: `Investor: ${investment.title}`,
      service: "Investment",
      budget: text(formData, "amount", 60),
      message: text(formData, "message", 1000),
      investmentId: investment.id,
      projectId: investment.projectId,
    },
    returnTo,
  );
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function updateLeadAction(formData: FormData) {
  const { user: actor } = await requireStaff("leads", "update");
  const id = text(formData, "id", 60);
  const back = (code: string) => redirect(`/sales/leads/${id}?error=${code}`);
  if (!(await getLead(id))) redirect("/sales?error=missing");

  const status = text(formData, "status", 40);
  const followUpDate = text(formData, "follow_up_date", 10);
  const assignedToId = text(formData, "assigned_to_id", 60) || null;
  if (!isKey(LEAD_STATUSES, status)) back("required");
  if (followUpDate && !(DATE_RE.test(followUpDate) && !Number.isNaN(Date.parse(followUpDate)))) back("date");

  const result = await updateLead(id, {
    status,
    followUpDate: followUpDate || null,
    assignedToId,
    notes: text(formData, "notes", 5000),
  });
  await writeAuditLog({ userId: actor.id, action: "update", module: "leads", recordId: id, oldValue: result?.before, newValue: result?.after });

  revalidatePath("/sales");
  redirect(`/sales/leads/${id}?saved=1`);
}

export async function addLeadAction(formData: FormData) {
  const { user: actor } = await requireStaff("leads", "add");
  const back = (code: string) => redirect(`/sales/leads/new?error=${code}`);
  const name = text(formData, "name", 120);
  const phone = text(formData, "phone", 30);
  if (name.length < 2) back("required");
  if (!PHONE_RE.test(phone)) back("phone");
  const lead = await createLead({
    name,
    phone,
    email: text(formData, "email", 200),
    city: text(formData, "city", 60),
    interest: text(formData, "interest", 150) || "Walk-in / phone enquiry",
    source: "manual",
    service: text(formData, "service", 120),
    location: text(formData, "location", 120),
    budget: text(formData, "budget", 60),
    message: text(formData, "message", 2000),
  });
  await writeAuditLog({ userId: actor.id, action: "create", module: "leads", recordId: lead.id, newValue: { name, interest: text(formData, "interest", 150) } });
  revalidatePath("/sales");
  redirect(`/sales/leads/${lead.id}?saved=created`);
}
