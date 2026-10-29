"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { DOCUMENT_TYPES } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { canSeeDocuments, createDocumentRecord, getUserById, notifyUser, setDocumentFile, writeAuditLog } from "@/lib/data";
import { BUYER_FILE_EXT, BUYER_FILE_MAX_BYTES } from "@/lib/document-access";
import { documentsReturn, withParam } from "@/lib/documents-return";
import { sendNewDocumentEmail } from "@/lib/email";
import { isDocumentKey, newDocumentKey, saveDocumentFile } from "@/lib/files";
import { requireStaff } from "@/lib/permissions";
import { contentTypeFor, storage } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_UPLOAD_EXT = /\.(pdf|jpe?g|png|webp|docx?|xlsx?)$/i;

function text(formData: FormData, key: string, max = 200): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

type Audience = "public" | "buyer";
type Stored = { storagePath: string; fileName: string; size: number };

/** File-type rule for an audience: customers get drawings, images and ZIPs; public documents office files. */
function typeError(audience: Audience, name: string) {
  if (audience === "buyer") return BUYER_FILE_EXT.test(name) ? null : "buyer-type";
  return ALLOWED_UPLOAD_EXT.test(name) ? null : "type";
}

/**
 * The form's file, stored. Either the browser already sent it straight to the bucket (large files, see
 * startDocumentUploadAction) and the form carries its key, or the file comes in the form and is saved here.
 * Returns the stored file or the error code that rejects it.
 */
async function readUpload(formData: FormData, audience: Audience): Promise<Stored | string> {
  const key = text(formData, "uploaded_key", 300);
  if (key) {
    if (!isDocumentKey(audience, key)) return "upload-missing";
    const fileName = key.slice(key.lastIndexOf("/") + 38);
    const bad = typeError(audience, fileName);
    if (bad) return bad;
    const size = await storage().size(key);
    if (!size) return "upload-missing";
    if (size > BUYER_FILE_MAX_BYTES) {
      await storage().remove(key).catch(() => undefined);
      return "size";
    }
    return { storagePath: key, fileName, size };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return "required";
  if (file.size > MAX_UPLOAD_BYTES) return "size";
  const bad = typeError(audience, file.name);
  if (bad) return bad;
  const saved = await saveDocumentFile(audience, file.name, Buffer.from(await file.arrayBuffer()), contentTypeFor(file.name));
  return { ...saved, size: file.size };
}

/**
 * Step 1 of a direct upload: a short-lived link the browser PUTs the file to, straight into the bucket.
 * Null when storage cannot sign links (local development); the form then sends the file itself.
 */
export async function startDocumentUploadAction(input: { fileName: string; size: number; audience: Audience }) {
  await requireStaff("documents", "add");
  const audience: Audience = input.audience === "buyer" ? "buyer" : "public";
  if (typeError(audience, input.fileName)) return { error: audience === "buyer" ? "Customer files must be PDF, DWG, an image or ZIP." : "Unsupported file type." };
  if (!(input.size > 0) || input.size > BUYER_FILE_MAX_BYTES) return { error: "This file is larger than 200 MB." };
  const { storagePath } = newDocumentKey(audience, input.fileName);
  const contentType = contentTypeFor(storagePath);
  const url = await storage().signedUploadUrl(storagePath, contentType);
  return url ? { key: storagePath, url, contentType } : null;
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
  if (!name) fail("required");
  if (!(DOCUMENT_TYPES as readonly string[]).includes(category)) fail("doc-type");
  if (projectId && !(await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }))) fail("missing");
  if (audience === "buyer") {
    const buyer = userId ? await getUserById(userId) : undefined;
    if (!buyer || buyer.role !== "buyer") fail("buyer");
  }

  const file = await readUpload(formData, audience);
  if (typeof file === "string") return fail(file);
  const { storagePath, fileName } = file;
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
  // Only a customer who can see their documents is told about one (see canSeeDocuments).
  if (userId && (await canSeeDocuments(userId))) {
    await notifyUser(userId, { type: "document", title: `New document: ${name}`, message: "A new document has been added to your portal.", link: "/portal/documents" });
    after(async () => {
      const buyer = await getUserById(userId);
      if (buyer) await sendNewDocumentEmail(buyer, name);
    });
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
  const audience = current.audience === "buyer" ? "buyer" : "public";
  const file = await readUpload(formData, audience);
  if (typeof file === "string") redirect(withParam(back, `error=${file}`));
  const { storagePath, fileName } = file;
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
  if (result.after.audience === "buyer" && result.after.userId && (await canSeeDocuments(result.after.userId))) {
    await notifyUser(result.after.userId, {
      type: "document",
      title: result.replaced ? `Updated document: ${result.after.name} (${result.after.version})` : `Document ready: ${result.after.name}`,
      message: result.replaced ? "A newer version of this document is in your portal." : "The file for this document is now in your portal.",
      link: "/portal/documents",
    });
    const buyerId = result.after.userId;
    after(async () => {
      const buyer = await getUserById(buyerId);
      if (buyer) await sendNewDocumentEmail(buyer, result.after.name, result.replaced);
    });
  }
  revalidateDocuments();
  redirect(withParam(back, `saved=${result.replaced ? "version" : "attached"}`));
}

/** A payment proof the customer sent from their portal: staff mark it checked once the payment is recorded. */
export async function markDocumentCheckedAction(formData: FormData) {
  const { user: actor } = await requireStaff("documents", "update");
  const id = text(formData, "id");
  const back = documentsReturn(formData);
  const doc = await prisma.document.findUnique({ where: { id }, select: { status: true, audience: true } });
  if (!doc || doc.audience !== "buyer") redirect(withParam(back, "error=missing"));
  await prisma.document.update({ where: { id }, data: { status: "Approved" } });
  await writeAuditLog({ userId: actor.id, action: "update", module: "documents", recordId: id, oldValue: { status: doc.status }, newValue: { status: "Approved" } });
  revalidateDocuments();
  redirect(withParam(back, "saved=checked"));
}
