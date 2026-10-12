import { PortalShell } from "@/components/PortalShell";
import { formatDate, formatPkr } from "@/lib/format";
import { getBookingsForUserDetailed, getSiteSettings } from "@/lib/data";
import { requireUser } from "@/lib/require-user";
import { permissionsFor } from "@/lib/permissions";

export default async function PortalPaymentsPage() {
  const user = await requireUser(["buyer"]);
  const can = await permissionsFor(user);
  if (!can("payments", "view")) {
    return (
      <PortalShell title="Payments">
      <p className="rounded-md bg-stone-100 p-4 text-sm text-stone-700">
        This section is not available for your account. Please contact Friends Associates if you need access.
      </p>
      </PortalShell>
    );
  }
  const [bookings, settings] = await Promise.all([getBookingsForUserDetailed(user.id), getSiteSettings()]);

  return (
    <PortalShell title="Payments">
      {settings.payment_gateway_enabled ? (
        <p className="text-sm text-stone-500">Online checkout (inactive in this phase).</p>
      ) : (
        <p className="rounded-md bg-stone-100 p-3 text-sm text-stone-700">
          Payment figures are updated by Friends Associates staff after bank transfer, cash or cheque. There is no online checkout on this website.
        </p>
      )}
      {bookings.length === 0 && <p className="mt-6 text-sm text-stone-500">No payment records available.</p>}
      {bookings.map((b) => {
          const prop = b.property;
          const pct = b.total_price_pkr > 0 ? Math.round((b.paid_pkr / b.total_price_pkr) * 100) : 0;
          return (
            <div key={b.id} className="mt-6 rounded-xl border bg-white p-4">
              <p className="font-medium">{prop?.title}</p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-stone-500">Total price</dt>
                  <dd>{formatPkr(b.total_price_pkr)}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Total paid</dt>
                  <dd>{formatPkr(b.paid_pkr)}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Outstanding</dt>
                  <dd>{formatPkr(b.outstanding_pkr)}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Paid so far</dt>
                  <dd>{pct}%</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Instalments</dt>
                  <dd>
                    {b.payments_received} received / {b.payments_remaining} remaining
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Next payment</dt>
                  <dd>
                    {formatDate(b.next_payment_date)} — {formatPkr(b.next_payment_amount_pkr)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
    </PortalShell>
  );
}
