import { NextResponse } from "next/server";
import { contentTypeFor, storage } from "@/lib/storage";

type Props = { params: Promise<{ key: string[] }> };

/** Serves website images from storage. Only the public/ area is reachable here; documents are not. */
export async function GET(_req: Request, { params }: Props) {
  const key = (await params).key.join("/");
  if (!key.startsWith("public/")) return new NextResponse("Not found", { status: 404 });

  let data: Buffer | null = null;
  try {
    data = await storage().get(key);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(key),
      // Keys are random UUIDs and never reused, so the file can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
