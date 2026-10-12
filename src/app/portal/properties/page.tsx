import { PortalShell } from "@/components/PortalShell";
import { formatPkr } from "@/lib/format";
import { getBookingsForUserDetailed } from "@/lib/data";
import { requireUser } from "@/lib/require-user";
import { permissionsFor } from "@/lib/permissions";

export default async function PortalPropertiesPage() {
  const user = await requireUser(["buyer"]);
  const can = await permissionsFor(user);
  if (!can("bookings", "view")) {
    return (
      <PortalShell title="My properties">
      <p className="rounded-md bg-stone-100 p-4 text-sm text-stone-700">
        This section is not available for your account. Please contact Friends Associates if you need access.
      </p>
      </PortalShell>
    );
  }
  const bookings = await getBookingsForUserDetailed(user.id);

  return (
    <PortalShell title="My properties">
      <ul className="space-y-4">
        {bookings.length === 0 && <li className="text-sm text-stone-500">No properties assigned to your account yet.</li>}
        {bookings.map((b) => {
            const prop = b.property;
            const proj = b.project;
            return (
              <li key={b.id} className="rounded-lg border bg-white p-4">
                <p className="font-medium">{prop?.title}</p>
                <p className="text-sm text-stone-600">
                  {proj?.name} · {b.status}
                </p>
                <p className="mt-2 text-sm">
                  Booked {b.booked_on} · {formatPkr(b.total_price_pkr)}
                </p>
              </li>
            );
          })}
      </ul>
    </PortalShell>
  );
}
