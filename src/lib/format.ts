export function formatPkr(amount: number): string {
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `PKR ${cr.toFixed(2)} Cr`;
  }
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Sep 2026". Built by hand so every runtime prints the same (newer ICU writes "Sept"). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function progressStages(percent: number): { name: string; active: boolean; done: boolean }[] {
  const stages = ["Earthworks", "Structure", "MEP", "Finishing", "Handover"];
  const band = Math.min(4, Math.floor(percent / 20));
  return stages.map((name, i) => ({
    name,
    done: i < band,
    active: i === band,
  }));
}

/** Up to two decimals, trailing zeros dropped: 1.20 → "1.2", 2.00 → "2". */
function compact(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Pakistani Lakh/Crore notation for public prices:
 *   45000 → "PKR 45,000", 120000 → "PKR 1.2 Lakh", 12500000 → "PKR 1.25 Crore".
 */
export function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `PKR ${compact(amount / 10_000_000)} Crore`;
  if (amount >= 100_000) return `PKR ${compact(amount / 100_000)} Lakh`;
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

/** "1 project" / "2 projects". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
