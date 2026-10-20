"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/shell/icons";

/** Pakistani numbers in any common form to the wa.me / tel format. */
export function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits.length === 10 ? `92${digits}` : digits;
}

/**
 * Call / WhatsApp / Email for a lead. Each tap is recorded in the lead's history (and a first contact moves
 * a new lead to Contacted) before the phone, WhatsApp or mail app opens.
 */
export function ContactButtons({
  leadId,
  phone,
  email,
  name,
  size = "md",
  showEmail = true,
  assignHref,
}: {
  leadId: string;
  phone: string;
  email?: string;
  name: string;
  size?: "sm" | "md";
  showEmail?: boolean;
  /** When set, a dashed "Assign" button is shown instead of Email (phone cards). */
  assignHref?: string;
}) {
  const router = useRouter();
  const log = (kind: "call" | "whatsapp" | "email") => {
    const body = JSON.stringify({ kind });
    // keepalive lets the request finish even though the browser is switching to the phone/WhatsApp app.
    fetch(`/api/leads/${leadId}/touch`, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true })
      .then(() => router.refresh())
      .catch(() => undefined);
  };
  const tel = `tel:+${waNumber(phone)}`;
  const wa = `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(`Assalam-o-Alaikum ${name}, this is Friends Associates regarding your enquiry.`)}`;
  const pad = size === "sm" ? "py-2.5 text-sm" : "py-3 text-[15px]";
  return (
    <div className="grid grid-cols-3 gap-2">
      <a href={tel} onClick={() => log("call")} className={`flex items-center justify-center gap-2 rounded-full bg-ink font-semibold text-paper hover:bg-body ${pad}`}>
        <Icon name="phone" className="h-4.5 w-4.5" /> Call
      </a>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => log("whatsapp")}
        className={`flex items-center justify-center rounded-full border-[1.5px] border-line-strong bg-white font-semibold text-ink hover:bg-mist ${pad}`}
      >
        WhatsApp
      </a>
      {assignHref ? (
        <a href={assignHref} className={`flex items-center justify-center rounded-full border-[1.5px] border-dashed border-line-strong font-semibold text-body hover:bg-mist ${pad}`}>
          Assign
        </a>
      ) : showEmail && email ? (
        <a
          href={`mailto:${email}`}
          onClick={() => log("email")}
          className={`flex items-center justify-center rounded-full border-[1.5px] border-line-strong bg-white font-semibold text-ink hover:bg-mist ${pad}`}
        >
          Email
        </a>
      ) : (
        <span className={`flex items-center justify-center rounded-full border-[1.5px] border-line text-quiet ${pad}`} title="No email on this lead">
          Email
        </span>
      )}
    </div>
  );
}
