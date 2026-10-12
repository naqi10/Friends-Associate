import { PortalShell } from "@/components/PortalShell";
import { requireUser } from "@/lib/require-user";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function PortalProfilePage({ searchParams }: Props) {
  const user = await requireUser(["buyer"]);
  const sp = await searchParams;
  return (
    <PortalShell title="Profile">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-stone-500">Name</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Phone</dt>
          <dd>{user.phone}</dd>
        </div>
        <div>
          <dt className="text-stone-500">City</dt>
          <dd>{user.city}</dd>
        </div>
        <div>
          <dt className="text-stone-500">CNIC</dt>
          <dd>{user.cnic}</dd>
        </div>
      </dl>
      <div className="mt-8">
        <ChangePasswordForm saved={sp.saved} error={sp.error} />
      </div>
    </PortalShell>
  );
}
