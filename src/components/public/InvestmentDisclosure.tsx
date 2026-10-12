/** Shown on every investment page: an opportunity to discuss, never a promise of returns. */
export function InvestmentDisclosure() {
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <strong>Please note:</strong> these are opportunities to discuss, not a public offer. Every investment is made under a written agreement.
      Returns depend on construction, approvals and the property market and are <strong>not guaranteed</strong>. Figures are set by Friends Associates
      and may change — check the &ldquo;last updated&rdquo; date and confirm terms with our team.
    </p>
  );
}
