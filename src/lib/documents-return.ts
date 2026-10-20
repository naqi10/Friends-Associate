/** Where a Documents form sends the user back to: the list they came from (tab, search, filters), never another site. */
export function documentsReturn(formData: FormData): string {
  const raw = String(formData.get("return") ?? "");
  if (!/^\/admin\/documents(\?|$)/.test(raw) || raw.includes("//")) return "/admin/documents";
  const url = new URL(raw, "http://x");
  for (const k of ["saved", "error", "n"]) url.searchParams.delete(k);
  const qs = url.searchParams.toString();
  return `/admin/documents${qs ? `?${qs}` : ""}`;
}

export function withParam(path: string, param: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${param}`;
}
