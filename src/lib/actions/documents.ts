"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOCUMENT_TYPES } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { createDocumentRecord, getUserById, notifyUser, setDocumentFile, writeAuditLog } from "@/lib/data";
import { documentsReturn, withParam } from "@/lib/documents-return";
import { saveDocumentFile } from "@/lib/files";
import { requireStaff } from "@/lib/permissions";
import { contentTypeFor } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_UPLOAD_EXT = /\.(pdf|jpe?g|png|webp|docx?|xlsx?)$/i;

function text(formData: FormData, key: string, max = 200): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Returns the file or the error code that rejects it. */
function checkFile(formData: FormData): File | string {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return "required";
  if (file.size > MAX_UPLOAD_BYTES) return "size";
  if (!ALLOWED_UPLOAD_EXT.test(file.name)) return "type";
  return file;
}

function revalidateDocuments() {
  revalidatePath("/documents");
  revalidatePath("/portal/documents");
  revalidatePath("/admin/documents");
}

export async function uploadDocumentAction(formData: FormData) {
  const { user: actor } = await requireStaff("documents", "add");
  const back = documentsReturn(formData);
  const fail = (code: string): never => redirect(withParam(back, `error=${code}`));

  const audience = text(formData, "audience") === "buyer" ? "buyer" : "public";
  const name = text(formData, "name", 160);
  const category = text(formData, "category");
  const projectId = text(formData, "project_id") || null;
  const userId = audience === "buyer" ? text(formData, "user_id") || null : null;
  const file = checkFile(formData);
  if (!name) fail("required");
  if (typeof file === "string") return fail(file);
  if (!(DOCUMENT_TYPES as readonly string[]).includes(category)) fail("doc-type");
  if (projectId && !(await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }))) fail("missing");
  if (audience === "buyer") {
    const buyer = userId ? await getUserById(userId) : undefined;
    if (!buyer || buyer.role !== "buyer") fail("buyer");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { storagePath, fileName } = await saveDocumentFile(audience, file.name, bytes, contentTypeFor(file.name));
  const doc = await createDocumentRecord({
    audience,
    userId,
    projectId,
    name,
    category,
    issuedOn: new Date().toISOString().slice(0, 10),
    fileName,
    storagePath,
  });
  await writeAuditLog({
    userId: actor.id,
    action: "upload",
    module: "documents",
    recordId: doc.id,
    newValue: { name, category, audience, userId, projectId, fileName, sizeBytes: file.size },
  });
  if (userId) {
    await notifyUser(userId, { type: "document", title: `New document: ${name}`, message: "A new document has been added to your portal.", link: "/portal/documents" });
  }
  revalidateDocuments();
  redirect(withParam(back, "saved=1"));
}

/**
 * Attaches a file to a document that has none, or uploads a new version of one that has. The old file is kept
 * as a version (Version history), so nothing a buyer was given is ever lost.
 */
export async function setDocumentFileAction(formData: FormData) {
  const id = text(formData, "id");
  const back = documentsReturn(formData);
  const current = await prisma.document.findUnique({ where: { id }, select: { storagePath: true, audience: true } });
  if (!current) redirect(withParam(back, "error=missing"));
  // Attaching to an empty record is part of adding; replacing an existing file changes it.
  const { user: actor } = await requireStaff("documents", current.storagePath ? "update" : "add");
  const file = checkFile(formData);
  if (typeof file === "string") redirect(withParam(back, `error=${file}`));

  const bytes = Buffer.from(await file.arrayBuffer());
  const audience = current.audience === "buyer" ? "buyer" : "public";
  const { storagePath, fileName } = await saveDocumentFile(audience, file.name, bytes, contentTypeFor(file.name));
  const result = await setDocumentFile({ docId: id, storagePath, fileName, actorId: actor.id });
  if (!result) redirect(withParam(back, "error=missing"));
  await writeAuditLog({
    userId: actor.id,
    action: result.replaced ? "new-version" : "attach-file",
    module: "documents",
    recordId: id,
    oldValue: { fileName: result.before.fileName, version: result.before.version, storagePath: result.before.storagePath },
    newValue: { fileName, version: result.after.version, sizeBytes: file.size },
  });
  if (result.after.audience === "buyer" && result.after.userId) {
    await notifyUser(result.after.userId, {
      type: "document",
      title: result.replaced ? `Updated document: ${result.after.name} (${result.after.version})` : `Document ready: ${result.after.name}`,
      message: result.replaced ? "A newer version of this document is in your portal." : "The file for this document is now in your portal.",
      link: "/portal/documents",
    });
  }
  revalidateDocuments();
  redirect(withParam(back, `saved=${result.replaced ? "version" : "attached"}`));
}
