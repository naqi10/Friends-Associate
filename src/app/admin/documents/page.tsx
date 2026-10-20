import Link from "next/link";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DocumentUpload, FilePickForm } from "@/components/admin/DocumentUpload";
import { Icon } from "@/components/admin/shell/icons";
import { AutoSelect } from "@/components/sales/AutoSubmit";
import { setDocumentFileAction, uploadDocumentAction } from "@/lib/actions/documents";
import { deleteDocumentAction } from "@/lib/actions/lifecycle";
import { DOCUMENT_TYPES } from "@/lib/catalog";
import { getDocumentRowsForAdmin, getDocumentVersions, getProjects, getUsers } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Documents" };

type Props = {
  searchParams: Promise<{ saved?: string; error?: string; buyer?: string; tab?: string; q?: string; type?: string; missing?: string; versions?: string }>;
};
type Row = Awaited<ReturnType<typeof getDocumentRowsForAdmin>>[number];

const SAVED: Record<string, string> = {
  "1": "Document uploaded.",
  attached: "File attached. It can be downloaded now.",
  version: "New version uploaded. The previous file is kept in Version history.",
  deleted: "Document deleted.",
};

function fileIcon(fileName: string) {
  return /\.(jpe?g|png|webp)$/i.test(fileName) ? "grid" : /\.xlsx?$/i.test(fileName) ? "table" : "file";
}

function href(base: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/admin/documents${s ? `?${s}` : ""}`;
}

function Audience({ d }: { d: Row }) {
  if (d.audience === "public") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-900">
        <Icon name="globe" className="h-3.5 w-3.5" /> Everyone
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
      <Icon name="lock" className="h-3.5 w-3.5 shrink-0" />
      {d.user ? (
        <Link href={`/admin/customers/${d.user.id}`} className="truncate hover:underline">
          {d.user.name}
        </Link>
      ) : (
        "Buyer"
      )}
    </span>
  );
}

export default async function AdminDocumentsPage({ searchParams }: Props) {
  const { can } = await requireStaff("documents", "add");
  const [sp, allDocs, users, projects] = await Promise.all([searchParams, getDocumentRowsForAdmin(), getUsers(), getProjects()]);
  const buyers = users.filter((u) => u.role === "buyer");
  // "Booking documents" from the Bookings desk opens this list for one buyer.
  const forBuyer = sp.buyer ? buyers.find((u) => u.id === sp.buyer) : undefined;
  const tab = sp.tab === "public" || sp.tab === "private" ? sp.tab : "all";
  const base = { buyer: forBuyer?.id, tab: tab === "all" ? undefined : tab, q: sp.q?.trim() || undefined, type: sp.type || undefined, missing: sp.missing === "1" ? "1" : undefined };
  const returnTo = href(base, {});

  const scoped = forBuyer ? allDocs.filter((d) => d.user?.id === forBuyer.id) : allDocs;
  const publicDocs = scoped.filter((d) => d.audience === "public");
  const privateDocs = scoped.filter((d) => d.audience !== "public");
  const missingPublic = allDocs.filter((d) => d.audience === "public" && !d.storagePath).length;
  const q = base.q?.toLowerCase();
  const docs = (tab === "public" ? publicDocs : tab === "private" ? privateDocs : scoped).filter(
    (d) =>
      (!q || `${d.name} ${d.category} ${d.project?.name ?? ""} ${d.user?.name ?? ""} ${d.fileName}`.toLowerCase().includes(q)) &&
      (!base.type || d.category.toLowerCase() === base.type.toLowerCase()) &&
      (!base.missing || !d.storagePath),
  );
  const typeOptions = [...new Set([...DOCUMENT_TYPES, ...allDocs.map((d) => d.category)])].sort((a, b) => a.localeCompare(b));
  const canUpdate = can("documents", "update");
  const canDelete = can("documents", "delete");
  const historyDoc = sp.versions ? allDocs.find((d) => d.id === sp.versions) : undefined;
  const history = historyDoc ? await getDocumentVersions(historyDoc.id) : [];

  function fileCell(d: Row, wide = false) {
    if (d.storagePath) {
      return (
        <a href={`/api/documents/${d.id}/download`} className={`inline-flex items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-4 py-2 text-sm font-semibold hover:bg-mist ${wide ? "w-full justify-center" : ""}`}>
          <Icon name="download" className="h-4 w-4" /> Download
        </a>
      );
    }
    return (
      <FilePickForm
        action={setDocumentFileAction}
        id={d.id}
        returnTo={returnTo}
        className={`inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 ${wide ? "w-full" : ""}`}
        label={
          <>
            <Icon name="plus" className="h-4 w-4" /> Attach file
          </>
        }
      />
    );
  }

  function rowMenu(d: Row) {
    return (
      <details className="relative">
        <summary aria-label={`More actions for ${d.name}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-mist">
          <Icon name="more" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-64 space-y-0.5 rounded-2xl border border-line bg-white p-2 text-left text-sm shadow-xl">
          {d.storagePath && (
            <a href={`/api/documents/${d.id}/download`} className="block rounded-xl px-3 py-2 hover:bg-mist">
              Download {d.version ? `(${d.version})` : ""}
            </a>
          )}
          {d.storagePath && canUpdate && (
            <FilePickForm action={setDocumentFileAction} id={d.id} returnTo={returnTo} className="block rounded-xl px-3 py-2 hover:bg-mist" label="Replace with a new version…" />
          )}
          {!d.storagePath && <FilePickForm action={setDocumentFileAction} id={d.id} returnTo={returnTo} className="block rounded-xl px-3 py-2 hover:bg-mist" label="Attach file…" />}
          <Link href={href(base, { versions: d.id })} className="block rounded-xl px-3 py-2 hover:bg-mist">
            Version history{d._count.versions ? ` (${d._count.versions} older)` : ""}
          </Link>
          {canDelete && (
            <form action={deleteDocumentAction} className="border-t border-line pt-1">
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="return" value={returnTo} />
              <ConfirmButton
                className="w-full !rounded-xl !bg-transparent !px-3 !py-2 text-left !font-normal !text-red-700 hover:!bg-red-50"
                title="Delete document?"
                confirmLabel="Delete"
                message={`Delete "${d.name}"${d.user ? ` (${d.user.name}'s document)` : ""}? The file and all older versions are removed. This cannot be undone.`}
              >
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
      </details>
    );
  }

  const subtitle = forBuyer ? (
    <>
      Documents of <strong className="text-ink">{forBuyer.name}</strong> ·{" "}
      <Link href="/admin/documents" className="text-teal-800 underline underline-offset-4">
        show all
      </Link>
    </>
  ) : (
    "Brochures and plans for the website, and private files for each buyer's portal."
  );

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">Documents</h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="lg:hidden">
              {publicDocs.length} public · {privateDocs.length} private
            </span>
            <span className="hidden lg:inline">{subtitle}</span>
          </p>
        </div>
        <a href="#upload" className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body min-[1400px]:hidden">
          <Icon name="upload" className="h-4.5 w-4.5" /> Upload
        </a>
      </div>
      {sp.saved && SAVED[sp.saved] && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{SAVED[sp.saved]}</p>}
      <FormError code={sp.error} />

      {missingPublic > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[22px] border-[1.5px] border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
          <Icon name="warning" className="h-5 w-5 shrink-0" />
          <p className="min-w-0 flex-1 text-[15px]">
            <strong>
              {missingPublic} public document{missingPublic === 1 ? " has" : "s have"} no file attached.
            </strong>{" "}
            <span className="max-sm:hidden">Visitors see them on the website but cannot download them yet.</span>
          </p>
          {!base.missing && (
            <Link href={href({}, { tab: "public", missing: "1" })} className="rounded-full bg-white px-4 py-2 text-sm font-semibold hover:bg-amber-100">
              Show them
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          {historyDoc && (
            <div className="admin-card mb-5 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Version history</h2>
                  <p className="truncate text-sm text-muted">{historyDoc.name}</p>
                </div>
                <Link href={returnTo} aria-label="Close version history" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-mist">
                  <Icon name="close" />
                </Link>
              </div>
              <ol className="mt-4 divide-y divide-line text-sm">
                <li className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <strong>{historyDoc.version ?? "Current"}</strong> · current · {historyDoc.storagePath ? historyDoc.fileName : "no file yet"}
                  </span>
                  {historyDoc.storagePath && (
                    <a href={`/api/documents/${historyDoc.id}/download`} className="font-semibold text-teal-800 underline underline-offset-4">
                      Download
                    </a>
                  )}
                </li>
                {history.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-body">
                    <span>
                      <strong>{v.version}</strong> · {v.fileName} · replaced {formatDate(v.createdAt.toISOString())}
                      {v.uploadedBy ? ` by ${v.uploadedBy.name}` : ""}
                    </span>
                    <a href={`/api/documents/${historyDoc.id}/versions/${v.id}`} className="font-semibold text-teal-800 underline underline-offset-4">
                      Download
                    </a>
                  </li>
                ))}
              </ol>
              {history.length === 0 && <p className="mt-1 text-sm text-muted">No older versions. Replacing the file keeps the old one here.</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Audience" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-mist p-1 text-[15px] whitespace-nowrap">
              {(
                [
                  ["all", "All", scoped.length],
                  ["public", "Public", publicDocs.length],
                  ["private", "Private (buyers)", privateDocs.length],
                ] as const
              ).map(([k, l, n]) => (
                <Link key={k} href={href(base, { tab: k === "all" ? undefined : k, missing: undefined })} className={`rounded-full px-4 py-2 ${tab === k ? "bg-white font-semibold shadow-sm" : "text-muted hover:text-ink"}`}>
                  {l} <span className="text-muted">{n}</span>
                </Link>
              ))}
            </nav>
            <form method="get" action="/admin/documents" className="flex min-w-0 flex-1 basis-[300px] flex-wrap gap-3">
              {base.buyer && <input type="hidden" name="buyer" value={base.buyer} />}
              {base.tab && <input type="hidden" name="tab" value={base.tab} />}
              <label className="flex w-full min-w-0 flex-1 items-center gap-3 sm:w-auto sm:basis-[200px] rounded-full border-[1.5px] border-line-strong bg-white px-5 py-2.5 focus-within:border-ink">
                <Icon name="search" className="h-5 w-5 text-muted" />
                <input name="q" type="search" defaultValue={base.q} placeholder="Search name, project or buyer" aria-label="Search documents" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
              </label>
              <AutoSelect name="type" defaultValue={base.type ?? ""} aria-label="Type" className="w-full min-w-0 truncate sm:w-auto sm:max-w-[230px] rounded-full border-[1.5px] border-line-strong bg-white px-4 py-2.5 text-[15px]">
                <option value="">All types</option>
                {typeOptions.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </AutoSelect>
            </form>
          </div>
          {base.missing && (
            <p className="mt-3 text-sm text-muted">
              Showing only documents without a file ·{" "}
              <Link href={href(base, { missing: undefined })} className="text-teal-800 underline underline-offset-4">
                show all
              </Link>
            </p>
          )}

          {docs.length === 0 ? (
            <p className="admin-card mt-5 px-6 py-12 text-center text-muted">No documents match.</p>
          ) : (
            <>
              <div className="admin-card mt-5 hidden md:block">
                <table className="w-full table-fixed text-left text-[15px]">
                  <thead className="text-sm text-muted">
                    <tr className="border-b border-line">
                      <th className="py-4 pr-3 pl-6 font-medium">Document</th>
                      <th className="w-[190px] px-3 py-4 font-medium">Who can see it</th>
                      <th className="hidden w-[130px] px-3 py-4 font-medium min-[1700px]:table-cell xl:max-[1399px]:table-cell">Date</th>
                      <th className="w-[160px] px-3 py-4 font-medium">File</th>
                      <th className="w-16 py-4 pr-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} className="border-b border-line align-middle last:border-0">
                        <td className="py-4 pr-3 pl-6">
                          <div className="flex items-center gap-3.5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist">
                              <Icon name={fileIcon(d.fileName)} className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold">
                                {d.name}
                                {d.version && <span className="ml-2 rounded-md bg-mist px-1.5 py-0.5 text-xs font-medium text-muted">{d.version}</span>}
                              </p>
                              <p className="text-sm text-muted">
                                {[d.category !== d.name && d.category, d.project?.name].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <Audience d={d} />
                        </td>
                        <td className="hidden px-3 py-4 whitespace-nowrap text-muted min-[1700px]:table-cell xl:max-[1399px]:table-cell">{formatDate(d.issuedOn)}</td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {fileCell(d)}
                        </td>
                        <td className="py-4 pr-4 text-right">
                          {rowMenu(d)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="mt-5 space-y-3 md:hidden">
                {docs.map((d) => (
                  <li key={d.id} className="admin-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist">
                        <Icon name={fileIcon(d.fileName)} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-sm text-muted">
                          {[d.category !== d.name && d.category, d.project?.name, formatDate(d.issuedOn)].filter(Boolean).join(" · ")}
                        </p>
                        <div className="mt-2">
                          <Audience d={d} />
                        </div>
                      </div>
                      {rowMenu(d)}
                    </div>
                    <div className="mt-3">
                      {fileCell(d, true)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <Icon name="alert" className="h-4 w-4 shrink-0" /> Delete, replace and upload a new version from the ⋮ menu. Old versions are kept.
          </p>
        </section>

        <aside id="upload" className="admin-card scroll-mt-6 p-5 sm:p-6 min-[1400px]:sticky min-[1400px]:top-6">
          <h2 className="mb-5 text-[20px] font-semibold">Upload a document</h2>
          <DocumentUpload
            action={uploadDocumentAction}
            types={DOCUMENT_TYPES}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            buyers={buyers.filter((b) => b.active !== false).map((b) => ({ id: b.id, name: b.name }))}
            returnTo={returnTo}
            defaultBuyerId={forBuyer?.id}
          />
        </aside>
      </div>
    </div>
  );
}
