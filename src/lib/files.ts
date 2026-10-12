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
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const storagePath = `private/documents/${audience}/${randomUUID()}-${safe}`;
  await storage().put(storagePath, bytes, contentType);
  return { storagePath, fileName: safe };
}
