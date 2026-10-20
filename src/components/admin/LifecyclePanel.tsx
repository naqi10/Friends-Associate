import { setArchivedAction } from "@/lib/actions/lifecycle";
import { formatDate } from "@/lib/format";
import { ConfirmButton } from "./ConfirmButton";

type Blocker = { label: string; count: number };

/**
 * Archive / restore / delete controls for one record. Delete is offered only when nothing depends on the
 * record; otherwise the panel says what is in the way. The server actions re-check all of this.
 */
export function LifecyclePanel({
  kind,
  id,
  name,
  archivedAt,
  canArchive,
  canDelete,
  deleteAction,
  blockers,
  archiveBlockedReason,
  what,
}: {
  kind: "project" | "property" | "investment";
  id: string;
  name: string;
  archivedAt: string | Date | null;
  canArchive: boolean;
  canDelete: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
  blockers: Blocker[];
  /** Set when archiving is not allowed right now (e.g. a booking in progress). */
  archiveBlockedReason?: string;
  /** e.g. "project", "unit", "investment opportunity" */
  what: string;
}) {
  if (!canArchive && !canDelete) return null;
  const inUse = blockers.filter((b) => b.count > 0);
  const archivedIso = archivedAt instanceof Date ? archivedAt.toISOString() : archivedAt;

  return (
    <section aria-labelledby={`lifecycle-${id}`} className="mt-8 admin-card p-6">
      <h2 id={`lifecycle-${id}`} className="font-semibold">
        Archive or delete
      </h2>

      {canArchive && (
        <div className="mt-3">
          {archivedIso ? (
            <>
              <p className="rounded-md bg-stone-100 p-3 text-sm text-stone-700">
                Archived on {formatDate(archivedIso)}. It is hidden from the website and from the main admin list. Restoring brings it back as
                unpublished, so you can check it before publishing again.
              </p>
              <form action={setArchivedAction} className="mt-3">
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="archived" value="0" />
                <ConfirmButton tone="neutral" message={`Restore "${name}"? It comes back unpublished.`}>
                  Restore from archive
                </ConfirmButton>
              </form>
            </>
          ) : archiveBlockedReason ? (
            <p className="text-sm text-stone-600">{archiveBlockedReason}</p>
          ) : (
            <form action={setArchivedAction}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="archived" value="1" />
              <p className="text-sm text-stone-600">
                Archiving hides this {what} from the website and the main list but keeps every record linked to it. You can restore it later.
              </p>
              <ConfirmButton tone="neutral" className="mt-3" message={`Archive "${name}"? It will be hidden from the website.`}>
                Archive {what}
              </ConfirmButton>
            </form>
          )}
        </div>
      )}

      {canDelete && (
        <div className="mt-6 border-t border-stone-200 pt-4">
          {inUse.length > 0 ? (
            <p className="text-sm text-stone-600">
              Cannot be deleted permanently because it is linked to {inUse.map((b) => `${b.count} ${b.label}`).join(", ")}.
              {canArchive && !archivedIso ? " Archive it instead." : ""}
            </p>
          ) : (
            <form action={deleteAction}>
              <input type="hidden" name="id" value={id} />
              <p className="text-sm text-stone-600">Permanently removes this {what} and its photo. This cannot be undone.</p>
              <ConfirmButton className="mt-3" message={`Permanently delete "${name}"? This cannot be undone.`}>
                Delete {what} permanently
              </ConfirmButton>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
