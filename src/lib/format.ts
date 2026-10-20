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

/** Today's date in Pakistan as YYYY-MM-DD (the server may run in another timezone). */
export function todayPk(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}

/** Receipt number as printed: 123 → "FA-R-000123". */
export function receiptLabel(receiptNo: number): string {
  return `FA-R-${String(receiptNo).padStart(6, "0")}`;
}

/** The instalment that is past due: the next payment once its date has passed, capped at the balance. */
export function overdueAmount(b: { outstandingPkr: number; nextPaymentDate: string; nextPaymentAmountPkr: number }, today = todayPk()): number {
  if (b.outstandingPkr <= 0 || !b.nextPaymentDate || b.nextPaymentDate >= today) return 0;
  return Math.min(b.nextPaymentAmountPkr, b.outstandingPkr);
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** Amount in words, Pakistani style, as printed on receipts: 1250000 → "Twelve Lakh Fifty Thousand Rupees Only". */
export function rupeesInWords(amount: number): string {
  let n = Math.floor(Math.abs(amount));
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${crore >= 100 ? belowThousand(crore) : belowHundred(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return `${parts.join(" ")} Rupees Only`;
}

/** Short amounts for small screens: 6750000 → "PKR 67.5 L", 10888889 → "PKR 1.09 Cr", 45000 → "PKR 45,000". */
export function formatPkrShort(amount: number): string {
  if (amount >= 10_000_000) return `PKR ${(Math.round((amount / 10_000_000) * 100) / 100).toString()} Cr`;
  if (amount >= 100_000) return `PKR ${(Math.round((amount / 100_000) * 10) / 10).toString()} L`;
  return `PKR ${amount.toLocaleString("en-PK")}`;
}
