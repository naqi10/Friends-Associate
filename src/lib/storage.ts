/**
 * File storage behind one interface. Keys are forward-slash paths:
 *   public/…   images shown on the website (served by /api/media/…)
 *   private/…  buyer and staff documents (served only by the permission-checked download API)
 *
 * STORAGE_DRIVER=local (default) writes under web/uploads.
 * STORAGE_DRIVER=s3 uses any S3-compatible bucket (Supabase Storage, Cloudflare R2, AWS S3):
 *   S3_BUCKET, S3_REGION, S3_ENDPOINT (optional for AWS), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 * The bucket should be private; the app serves files itself so access rules always apply.
 */
import fs from "fs/promises";
import path from "path";

export interface StorageDriver {
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
  /** Size in bytes, or null if the object does not exist. */
  size(key: string): Promise<number | null>;
  /**
   * Short-lived links so large files (DWG, ZIP) go straight between the browser and the bucket: the hosting
   * platform caps a request or response passing through the app at about 4.5 MB. Null when not supported (local).
   */
  signedUploadUrl(key: string, contentType: string): Promise<string | null>;
  signedDownloadUrl(key: string, fileName: string): Promise<string | null>;
}

const KEY_RE = /^(public|private)\/[A-Za-z0-9._\-/]+$/;

/** Rejects anything that is not a plain relative key, so "../" or absolute paths can never be used. */
export function assertKey(key: string) {
  if (!KEY_RE.test(key) || key.includes("..") || key.includes("//")) throw new Error("Invalid storage key");
  return key;
}

/** Legacy document rows stored Windows paths like "public\\123-file.pdf". */
export function normalizeKey(key: string) {
  return key.replace(/\\/g, "/");
}

class LocalDriver implements StorageDriver {
  private root = path.join(process.cwd(), "uploads");

  private full(key: string) {
    const full = path.join(this.root, ...assertKey(key).split("/"));
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, bytes: Buffer) {
    const full = this.full(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
  }

  async get(key: string) {
    try {
      return await fs.readFile(this.full(key));
    } catch {
      return null;
    }
  }

  async remove(key: string) {
    await fs.rm(this.full(key), { force: true });
  }

  async size(key: string) {
    try {
      return (await fs.stat(this.full(key))).size;
    } catch {
      return null;
    }
  }

  // Local development has no request size cap, so files go through the app as usual.
  async signedUploadUrl() {
    return null;
  }

  async signedDownloadUrl() {
    return null;
  }
}

class S3Driver implements StorageDriver {
  private clientPromise = import("@aws-sdk/client-s3").then(
    ({ S3Client }) =>
      new S3Client({
        region: process.env.S3_REGION ?? "auto",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: required("S3_ACCESS_KEY_ID"),
          secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
        },
      }),
  );
  private bucket = required("S3_BUCKET");

  async put(key: string, bytes: Buffer, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.clientPromise).send(
      new PutObjectCommand({ Bucket: this.bucket, Key: assertKey(key), Body: bytes, ContentType: contentType }),
    );
  }

  async get(key: string) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await (await this.clientPromise).send(new GetObjectCommand({ Bucket: this.bucket, Key: assertKey(key) }));
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    } catch (e) {
      if ((e as { name?: string }).name === "NoSuchKey") return null;
      throw e;
    }
  }

  async remove(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.clientPromise).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: assertKey(key) }));
  }

  async size(key: string) {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await (await this.clientPromise).send(new HeadObjectCommand({ Bucket: this.bucket, Key: assertKey(key) }));
      return res.ContentLength ?? 0;
    } catch (e) {
      const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || (e as { name?: string }).name === "NotFound") return null;
      throw e;
    }
  }

  async signedUploadUrl(key: string, contentType: string) {
    const [{ PutObjectCommand }, { getSignedUrl }] = await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner")]);
    return getSignedUrl(await this.clientPromise, new PutObjectCommand({ Bucket: this.bucket, Key: assertKey(key), ContentType: contentType }), {
      expiresIn: 15 * 60,
    });
  }

  async signedDownloadUrl(key: string, fileName: string) {
    const [{ GetObjectCommand }, { getSignedUrl }] = await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner")]);
    // A minute is enough to start the download; the link is useless to anyone it is forwarded to afterwards.
    return getSignedUrl(
      await this.clientPromise,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: assertKey(key),
        ResponseContentDisposition: `attachment; filename="${fileName.replace(/["\r\n]/g, "")}"`,
      }),
      { expiresIn: 60 },
    );
  }
}

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set when STORAGE_DRIVER=s3`);
  return v;
}

let driver: StorageDriver | undefined;

export function storage(): StorageDriver {
  driver ??= process.env.STORAGE_DRIVER === "s3" ? new S3Driver() : new LocalDriver();
  return driver;
}

export const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  dwg: "application/acad",
  dxf: "application/dxf",
  zip: "application/zip",
};

export function contentTypeFor(key: string) {
  return CONTENT_TYPES[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}
