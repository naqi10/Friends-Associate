import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDocumentVersionFile } from "@/lib/data";
import { permissionsFor } from "@/lib/permissions";
import { contentTypeFor, normalizeKey, storage } from "@/lib/storage";

type Props = { params: Promise<{ id: string; versionId: string }> };

/** Older versions of a document are an office record: staff with Documents → View only, never buyers. */
export async function GET(_req: Request, { params }: Props) {
  const { id, versionId } = await params;
  const user = await getSessionUser();
  const can = await permissionsFor(user);
  if (!user || user.role === "buyer" || !can("documents", "view")) {
    return NextResponse.json({ error: "You do not have permission to access this information." }, { status: 403 });
  }
  const v = await getDocumentVersionFile(id, versionId);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const key = normalizeKey(v.storagePath);
  // Large files: a one-minute signed bucket link (see the main download route).
  const signed = await storage()
    .signedDownloadUrl(key, v.fileName)
    .catch(() => null);
  if (signed) return NextResponse.redirect(signed, { status: 303, headers: { "Cache-Control": "private, no-store" } });
  const data = await storage()
    .get(key)
    .catch(() => null);
  if (!data) return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(key),
      "Content-Disposition": `attachment; filename="${v.fileName.replace(/["\r\n]/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
