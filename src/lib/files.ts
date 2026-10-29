import { randomUUID } from "crypto";
import { storage } from "./storage";

/**
 * Stores an uploaded document. All documents live under private/ — even "public" brochures are
 * served through the permission-checked download API, never through the open media route.
 */
export async function saveDocumentFile(
  audience: "public" | "buyer",
  originalName: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ storagePath: string; fileName: string }> {
  const { storagePath, fileName } = newDocumentKey(audience, originalName);
  await storage().put(storagePath, bytes, contentType);
  return { storagePath, fileName };
}

/** A fresh, unguessable storage key for a document file. */
export function newDocumentKey(audience: "public" | "buyer", originalName: string) {
  const fileName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  return { storagePath: `private/documents/${audience}/${randomUUID()}-${fileName}`, fileName };
}

/** A key handed out by newDocumentKey for this audience: never a path the browser could choose freely. */
export function isDocumentKey(audience: "public" | "buyer", key: string) {
  return new RegExp(`^private/documents/${audience}/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,120}$`).test(key);
}
