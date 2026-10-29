/**
 * Transactional email through Brevo's API (https://api.brevo.com/v3/smtp/email).
 *
 * Settings (Vercel → Environment Variables; never in code):
 *   BREVO_API_KEY      the client's Brevo API key. Without it, email is simply switched off.
 *   EMAIL_FROM         a sender address verified in Brevo, e.g. no-reply@faryk.com
 *   EMAIL_FROM_NAME    optional, defaults to "Friends Associates"
 *   LEAD_ALERT_TO      who gets new-enquiry alerts, comma-separated; defaults to the company email
 *
 * Sending never throws: a failed email must not break a form, a payment or a login.
 */
import { BRAND } from "./brand";
import { LEAD_SOURCES, labelOf } from "./catalog";
import { getCompany } from "./data";
import type { NewLead } from "./data/leads";
import { absoluteUrl } from "./seo";

// BREVO_API_URL only exists so tests can point at a local fake; production always uses Brevo.
const API = process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailEnabled() {
  return !!process.env.BREVO_API_KEY && EMAIL_RE.test(process.env.EMAIL_FROM ?? "");
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Mail = { to: string[]; subject: string; html: string; text: string; replyTo?: { email: string; name?: string } };

/** What is set up, for the admin's email check (never includes the key itself). */
export function emailSetup() {
  return {
    enabled: emailEnabled(),
    hasKey: !!process.env.BREVO_API_KEY,
    from: process.env.EMAIL_FROM ?? "",
    fromName: process.env.EMAIL_FROM_NAME || BRAND.name,
    alertTo: process.env.LEAD_ALERT_TO ?? "",
  };
}

/** Sends one email. Returns true when Brevo accepted it; logs and returns false otherwise. */
export async function sendEmail(mail: Mail): Promise<boolean> {
  return (await deliver(mail)).ok;
}

/** Like sendEmail, but also returns Brevo's reason when it refuses (shown to the admin on a test email). */
async function deliver(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  if (!emailEnabled()) return { ok: false, error: "Email is switched off: BREVO_API_KEY or a valid EMAIL_FROM is missing." };
  const to = [...new Set(mail.to.map((t) => t.trim().toLowerCase()).filter((t) => EMAIL_RE.test(t)))];
  if (to.length === 0) return { ok: false, error: "No valid recipient address." };
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_FROM_NAME || BRAND.name },
        to: to.map((email) => ({ email })),
        subject: mail.subject.slice(0, 200),
        htmlContent: mail.html,
        textContent: mail.text,
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Brevo's error body explains the problem (unverified sender, bad key…); it never contains the key.
      const body = (await res.text()).slice(0, 300);
      console.error("[email] Brevo refused the email:", res.status, body);
      let reason = body;
      try {
        reason = (JSON.parse(body) as { message?: string }).message ?? body;
      } catch {
        // not JSON: keep the raw text
      }
      return { ok: false, error: `Brevo refused it (${res.status}): ${reason}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] could not reach Brevo:", msg);
    return { ok: false, error: `Could not reach Brevo: ${msg}` };
  }
}

/** Simple branded layout: logo line, content, small footer. Inline styles only (email clients). */
function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#0e0e0e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e2e2de">
<img src="${absoluteUrl("/brand/mark.svg")}" width="40" height="33" alt="" style="vertical-align:middle"> <span style="font-family:Georgia,serif;font-size:22px;vertical-align:middle">${esc(BRAND.name)}</span>
</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;font-size:26px">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:18px 28px;background:#f4f4f2;font-size:12px;color:#5f5f5a">${esc(BRAND.name)} · ${esc(BRAND.city)} · ${esc(BRAND.phone)} · ${esc(BRAND.domain)}</td></tr>
</table></td></tr></table></body></html>`;
}

function rows(pairs: [string, unknown][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">${pairs
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;color:#5f5f5a;vertical-align:top;white-space:nowrap;border-bottom:1px solid #eeeeea">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeea;white-space:pre-line">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#0e0e0e;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${esc(label)}</a></p>`;

/**
 * A new website enquiry: an alert to the office (with Reply-To set to the client) and, when the client left an
 * email address, a short "we received your message" reply.
 */
export async function sendNewLeadEmails(lead: NewLead & { id: string }, opts: { confirm?: boolean } = {}) {
  if (!emailEnabled()) return;
  const company = await getCompany();
  const office = (process.env.LEAD_ALERT_TO || company.email).split(",");
  const source = labelOf(LEAD_SOURCES, lead.source) || lead.source;
  const details: [string, unknown][] = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["City", lead.city],
    ["Came from", source],
    ["Interested in", lead.interest],
    ["Service", lead.service],
    ["Location", lead.location],
    ["Size", lead.size],
    ["Budget", lead.budget],
    ["Message", lead.message],
    ...Object.entries(lead.details ?? {}).map(([k, v]) => [k, v] as [string, unknown]),
  ];
  const deskUrl = absoluteUrl(`/sales?lead=${lead.id}`);
  const wa = `https://wa.me/${lead.phone.replace(/\D/g, "").replace(/^0/, "92")}`;

  await sendEmail({
    to: office,
    subject: `New enquiry: ${lead.name} · ${source}`,
    replyTo: lead.email && EMAIL_RE.test(lead.email) ? { email: lead.email, name: lead.name } : undefined,
    html: layout(
      "New website enquiry",
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${esc(lead.name)} sent an enquiry through the <b>${esc(source.toLowerCase())}</b>.</p>${rows(details)}${button(deskUrl, "Open on Sales desk")}<p style="margin:14px 0 0;font-size:14px"><a href="tel:${esc(lead.phone.replace(/\s/g, ""))}" style="color:#0e0e0e">Call ${esc(lead.phone)}</a> · <a href="${esc(wa)}" style="color:#0e0e0e">WhatsApp</a></p>`,
    ),
    text: `New website enquiry (${source})\n\n${details
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n")}\n\nOpen on Sales desk: ${deskUrl}`,
  });

  if (opts.confirm !== false && lead.email && EMAIL_RE.test(lead.email)) {
    const whatsapp = `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`;
    await sendEmail({
      to: [lead.email],
      subject: `We received your enquiry · ${BRAND.name}`,
      replyTo: { email: company.email, name: BRAND.name },
      html: layout(
        `Thank you, ${lead.name.split(" ")[0]}`,
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">We received your enquiry about <b>${esc(lead.interest)}</b>. Our team will contact you soon on ${esc(lead.phone)}.</p><p style="margin:0;font-size:15px;line-height:1.6">If it is urgent, call us on <a href="tel:${esc(BRAND.phoneIntl.replace(/\s/g, ""))}" style="color:#0e0e0e">${esc(BRAND.phone)}</a> or message us on <a href="${esc(whatsapp)}" style="color:#0e0e0e">WhatsApp</a>.</p>`,
      ),
      text: `Thank you, ${lead.name}.\n\nWe received your enquiry about ${lead.interest}. Our team will contact you soon on ${lead.phone}.\nUrgent? Call ${BRAND.phone} or WhatsApp ${whatsapp}\n\n${BRAND.name} · ${BRAND.domain}`,
    });
  }
}

/** Tells a customer that a document was added to (or updated in) their portal. Sent after the response. */
export async function sendNewDocumentEmail(customer: { name: string; email: string }, docName: string, updated = false) {
  if (!emailEnabled() || !EMAIL_RE.test(customer.email)) return;
  const url = absoluteUrl("/portal/documents");
  const what = updated ? "A newer version of a document" : "A new document";
  await sendEmail({
    to: [customer.email],
    subject: `${updated ? "Updated document" : "New document"}: ${docName} · ${BRAND.name}`,
    html: layout(
      `Assalam-o-Alaikum, ${customer.name.split(" ")[0]}`,
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${what} is now in your customer portal:</p><p style="margin:0;padding:14px 16px;background:#f4f4f2;border-radius:12px;font-size:15px"><b>${esc(docName)}</b></p>${button(url, "Open my documents")}<p style="margin:18px 0 0;font-size:13px;color:#5f5f5a">Sign in with your user ID or email address. Questions? Call ${esc(BRAND.phone)}.</p>`,
    ),
    text: `Assalam-o-Alaikum ${customer.name},

${what} is now in your customer portal: ${docName}

Open it here: ${url}

${BRAND.name} · ${BRAND.phone}`,
  });
}

/**
 * The email copy of a customer's portal notification (payment received, instalment reminder, construction
 * progress…): the same title and message, with a button to the page it links to.
 */
export async function sendNotificationEmail(customer: { name: string; email: string }, n: { title: string; message?: string; link?: string }) {
  if (!emailEnabled() || !EMAIL_RE.test(customer.email)) return;
  const url = absoluteUrl(n.link && n.link.startsWith("/portal") ? n.link : "/portal");
  await sendEmail({
    to: [customer.email],
    subject: `${n.title} · ${BRAND.name}`,
    html: layout(
      n.title,
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Assalam-o-Alaikum ${esc(customer.name.split(" ")[0])},</p>${n.message ? `<p style="margin:0;font-size:15px;line-height:1.6">${esc(n.message)}</p>` : ""}${button(url, "Open my portal")}<p style="margin:18px 0 0;font-size:13px;color:#5f5f5a">Sign in with your user ID or email address. Questions? Call ${esc(BRAND.phone)}.</p>`,
    ),
    text: `Assalam-o-Alaikum ${customer.name},

${n.title}
${n.message ?? ""}

Open your portal: ${url}

${BRAND.name} · ${BRAND.phone}`,
  });
}

/** A new customer account: how to sign in. Never includes the password; the office gives that in person. */
export async function sendWelcomeEmail(customer: { name: string; email: string; username: string | null }) {
  if (!emailEnabled() || !EMAIL_RE.test(customer.email)) return;
  const url = absoluteUrl("/login");
  const login = customer.username ? `${customer.username} (or this email address)` : customer.email;
  await sendEmail({
    to: [customer.email],
    subject: `Your customer account is ready · ${BRAND.name}`,
    html: layout(
      `Welcome, ${customer.name.split(" ")[0]}`,
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Your ${esc(BRAND.name)} customer account is ready. In it you can see your property, payments, receipts and documents.</p>${rows([
        ["Sign in with", login],
        ["Password", "The one our office gave you"],
      ])}${button(url, "Sign in")}<p style="margin:18px 0 0;font-size:13px;color:#5f5f5a">Change your password after you sign in (Profile). Questions? Call ${esc(BRAND.phone)}.</p>`,
    ),
    text: `Welcome, ${customer.name}.

Your ${BRAND.name} customer account is ready.
Sign in with: ${login}
Password: the one our office gave you

Sign in here: ${url}

${BRAND.name} · ${BRAND.phone}`,
  });
}

/** Security notice after a customer's password changes, so a change they did not make gets noticed. */
export async function sendPasswordChangedEmail(customer: { name: string; email: string }, byOffice: boolean) {
  if (!emailEnabled() || !EMAIL_RE.test(customer.email)) return;
  const how = byOffice ? "Our office has set a new password for your customer account." : "The password of your customer account was just changed.";
  await sendEmail({
    to: [customer.email],
    subject: `Your password was changed · ${BRAND.name}`,
    html: layout(
      "Password changed",
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Assalam-o-Alaikum ${esc(customer.name.split(" ")[0])},</p><p style="margin:0 0 14px;font-size:15px;line-height:1.6">${how} You have been signed out on other devices.</p><p style="margin:0;font-size:15px;line-height:1.6">Did not ask for this? Call us straight away on ${esc(BRAND.phone)}.</p>${button(absoluteUrl("/login"), "Sign in")}`,
    ),
    text: `Assalam-o-Alaikum ${customer.name},

${how} You have been signed out on other devices.
Did not ask for this? Call us straight away on ${BRAND.phone}.

${BRAND.name} · ${absoluteUrl("/login")}`,
  });
}

/** Admin → "Send test email": proves the key, the sender and the domain's DNS records all work. */
export async function sendTestEmail(to: string) {
  const setup = emailSetup();
  return deliver({
    to: [to],
    subject: `Test email · ${BRAND.name}`,
    html: layout(
      "Email is working",
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">This test was sent from the ${esc(BRAND.domain)} admin through Brevo.</p>${rows([
        ["Sender", `${setup.fromName} <${setup.from}>`],
        ["Enquiry alerts go to", setup.alertTo || "the company email (Contact & footer)"],
      ])}<p style="margin:16px 0 0;font-size:13px;color:#5f5f5a">If this landed in spam, check the domain's SPF, DKIM and DMARC records in Brevo → Senders, domains &amp; dedicated IPs.</p>`,
    ),
    text: `Email is working. Sender: ${setup.fromName} <${setup.from}>.`,
  });
}
