import { FormError } from "@/components/FormError";
import { requestCallbackAction } from "@/lib/actions/leads";

/** Invisible to people, irresistible to bots. Submissions that fill it are silently dropped. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function FormStatus({ sent, error, sentText }: { sent?: string; error?: string; sentText: string }) {
  return (
    <>
      {sent === "1" && (
        <p role="status" className="rounded-md bg-teal-50 p-3 text-sm text-teal-900">
          {sentText}
        </p>
      )}
      <FormError code={error} />
    </>
  );
}

const input = "mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm";

/** "Request a callback" box used on property, project and contact pages. */
export function CallbackForm({
  returnTo,
  propertyId,
  projectId,
  interest,
  sent,
  error,
  title = "Request a callback",
}: {
  returnTo: string;
  propertyId?: string;
  projectId?: string;
  interest?: string;
  sent?: string;
  error?: string;
  title?: string;
}) {
  return (
    <section id="enquiry" className="scroll-mt-24 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-stone-600">Leave your number and our team will call you back.</p>
      <div className="mt-3">
        <FormStatus sent={sent} error={error} sentText="Thank you — our team will call you shortly." />
      </div>
      <form action={requestCallbackAction} className="relative mt-3 grid gap-3 sm:grid-cols-2">
        <Honeypot />
        <input type="hidden" name="returnTo" value={returnTo} />
        {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
        {projectId && <input type="hidden" name="projectId" value={projectId} />}
        {interest && <input type="hidden" name="interest" value={interest} />}
        <label className="text-sm">
          Name
          <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input} />
        </label>
        <label className="text-sm">
          Phone / WhatsApp
          <input name="phone" type="tel" required pattern="\+?[0-9][0-9\s\-]{6,18}" placeholder="03xx-xxxxxxx" autoComplete="tel" className={input} />
        </label>
        <label className="text-sm">
          City
          <input name="city" maxLength={60} autoComplete="address-level2" className={input} />
        </label>
        <label className="text-sm">
          Best time to call
          <select name="preferred_time" className={input}>
            <option>Any time</option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Message (optional)
          <textarea name="message" rows={2} maxLength={1000} className={input} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400">
            Request callback
          </button>
        </div>
      </form>
    </section>
  );
}
