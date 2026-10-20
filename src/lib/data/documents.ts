import { prisma } from "../db";

/** "v1.3" → "v2.0", "v2" → "v3", none → "v2" (the first replacement of an unversioned file). */
export function nextDocumentVersion(current: string | null | undefined): string {
  const m = current?.match(/^v?(\d+)(?:\.\d+)?$/i);
  if (!m) return "v2";
  const major = Number(m[1]) + 1;
  return current!.includes(".") ? `v${major}.0` : `v${major}`;
}

/**
 * Puts a new file on a document. A document without a file simply gets it. A document that already has one
 * keeps the old file as a version (never deleted) and moves to the next version number.
 */
export async function setDocumentFile(input: { docId: string; storagePath: string; fileName: string; actorId: string }) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({ where: { id: input.docId } });
    if (!doc) return null;
    const replaced = !!doc.storagePath;
    if (replaced) {
      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          version: doc.version ?? "v1",
          fileName: doc.fileName,
          storagePath: doc.storagePath!,
          uploadedById: input.actorId,
        },
      });
    }
    const version = replaced ? nextDocumentVersion(doc.version) : (doc.version ?? "v1");
    const after = await tx.document.update({
      where: { id: doc.id },
      data: { storagePath: input.storagePath, fileName: input.fileName, version, issuedOn: new Date().toISOString().slice(0, 10) },
    });
    return { before: doc, after, replaced };
  });
}

/** Earlier files of one document, newest first. `uploadedBy` is who replaced it. */
export async function getDocumentVersions(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: { id: true, version: true, fileName: true, createdAt: true, uploadedBy: { select: { name: true } } },
  });
}

export async function getDocumentVersionFile(documentId: string, versionId: string) {
  return prisma.documentVersion.findFirst({ where: { id: versionId, documentId }, select: { fileName: true, storagePath: true } });
}
