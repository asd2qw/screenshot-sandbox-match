export type ReceiptDraft = { supplier: string | null; date: string | null; total: number | null; vat: number | null };

/** Validates model JSON; drops implausible values instead of trusting them. */
export function parseReceiptExtraction(text: string): ReceiptDraft | null {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1_000_000 ? Math.round(v * 100) / 100 : null);
  const total = num(r["total"]) || null;
  let vat = num(r["vat"]);
  if (vat !== null && total !== null && vat >= total) vat = null;
  const d = typeof r["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r["date"]) && !Number.isNaN(Date.parse(r["date"])) ? r["date"] : null;
  const s = typeof r["supplier"] === "string" && r["supplier"].trim() ? r["supplier"].trim().slice(0, 200) : null;
  return { supplier: s, date: d, total, vat };
}
