import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDocumentRowById, getCompany } from "@/lib/data";
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
    if (!user.document_download_paid_at) {
      const company = await getCompany();
      return NextResponse.json(
        { error: `Paid feature. It needs a payment of ${company.document_download_fee_pkr / 1000}K once.` },
        { status: 402 },
      );
    }
  }

  const key = normalizeKey(doc.storagePath);
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
