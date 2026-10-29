import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canSeeDocuments, getDocumentRowById } from "@/lib/data";
import { contentTypeFor, normalizeKey, storage } from "@/lib/storage";
import { permissionsFor } from "@/lib/permissions";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const doc = await getDocumentRowById(id);
  if (!doc || !doc.storagePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getSessionUser();
  const can = await permissionsFor(user);
  const denied = () =>
    NextResponse.json({ error: "You do not have permission to access this information." }, { status: 403 });
  // Staff may download anything they are allowed to view in the documents module.
  const isStaffViewer = !!user && user.role !== "buyer" && can("documents", "view");

  if (doc.audience === "public" && !can("documents", "view")) return denied();

  if (doc.audience === "buyer" && !isStaffViewer) {
    // Ownership check first: a buyer can never fetch another buyer's file by changing the id.
    if (!user || user.role !== "buyer" || doc.userId !== user.id || !can("documents", "view")) return denied();
    if (!(await canSeeDocuments(user.id))) {
      return NextResponse.json({ error: "Your documents become available once your booking has its first payment. Please contact our office." }, { status: 403 });
    }
  }

  const key = normalizeKey(doc.storagePath);
  // Bucket storage: hand the browser a one-minute signed link, so large drawings and ZIPs never pass through
  // the app (the host caps responses at about 4.5 MB). The permission checks above have already passed.
  try {
    const signed = await storage().signedDownloadUrl(key, doc.fileName);
    if (signed) return NextResponse.redirect(signed, { status: 303, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    // fall back to sending the file ourselves
  }
  let data: Buffer | null = null;
  try {
    data = await storage().get(key);
  } catch {
    data = null;
  }
  if (!data) return NextResponse.json({ error: "File missing on server" }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(key),
      // Always a download, never rendered inline, so an uploaded file cannot run in the site's origin.
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/["\r\n]/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
