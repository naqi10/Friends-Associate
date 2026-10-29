import { startDocumentUploadAction } from "@/lib/actions/documents";

/** Files up to this size still work through the app if the bucket cannot be reached directly. */
const VIA_APP_MAX = 4 * 1024 * 1024;

export type DirectUpload = { key: string } | { error: string } | null;

/**
 * Sends a document straight to the storage bucket with a short-lived signed link, so large drawings and ZIPs
 * are not limited by the host's ~4.5 MB request cap. Returns the stored key, an error to show, or null when the
 * form should simply send the file itself (local development, or a small file when the bucket is unreachable).
 */
export async function uploadDirect(file: File, audience: "public" | "buyer", onProgress?: (percent: number) => void): Promise<DirectUpload> {
  let start;
  try {
    start = await startDocumentUploadAction({ fileName: file.name, size: file.size, audience });
  } catch {
    return file.size <= VIA_APP_MAX ? null : { error: "Could not start the upload. Please try again." };
  }
  if (!start) return null;
  if ("error" in start) return { error: start.error ?? "Upload refused." };

  const ok = await new Promise<boolean>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", start.url);
    xhr.setRequestHeader("Content-Type", start.contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
  if (ok) return { key: start.key };
  return file.size <= VIA_APP_MAX ? null : { error: "The upload did not finish. Check the connection and try again." };
}

/**
 * Submits `form` after a direct upload: the stored key goes in a hidden "uploaded_key" field and the file input
 * is disabled so the file is not sent a second time.
 */
export function submitWithKey(form: HTMLFormElement, fileInput: HTMLInputElement, key: string) {
  let hidden = form.querySelector<HTMLInputElement>('input[name="uploaded_key"]');
  if (!hidden) {
    hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "uploaded_key";
    form.appendChild(hidden);
  }
  hidden.value = key;
  fileInput.disabled = true;
  form.requestSubmit();
}
