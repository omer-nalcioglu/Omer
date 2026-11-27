/**
 * Para her yerde kuruş cinsinden tam sayı olarak tutulur (ondalık hata olmaz).
 * Görüntüleme ve KDV hesabı bu modülden geçer; e-Fatura adaptörleri de aynı değerleri kullanır.
 */
export type Kurus = number;

export const tl = (lira: number): Kurus => Math.round(lira * 100);

export function formatTL(k: Kurus): string {
  const neg = k < 0, v = Math.abs(k);
  const lira = Math.floor(v / 100), kr = v % 100;
  const s = lira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "-" : ""}${s}${kr ? "," + String(kr).padStart(2, "0") : ""} ₺`;
}

/** Bir satırın KDV'si: yarım kuruşlar yukarı yuvarlanır (GİB uygulamasıyla uyumlu). */
export const vatOf = (net: Kurus, ratePercent: number): Kurus => Math.round((net * ratePercent) / 100);

export interface LineAmount { qty: number; unitPrice: Kurus; discountPercent?: number; vatRate: number }

export function lineTotals(l: LineAmount) {
  const gross = Math.round(l.qty * l.unitPrice);
  const discount = Math.round((gross * (l.discountPercent ?? 0)) / 100);
  const net = gross - discount;
  const vat = vatOf(net, l.vatRate);
  return { gross, discount, net, vat, total: net + vat };
}

export function documentTotals(lines: LineAmount[]) {
  const t = { net: 0, vat: 0, total: 0, byRate: {} as Record<string, { net: Kurus; vat: Kurus }> };
  for (const l of lines) {
    const x = lineTotals(l);
    t.net += x.net; t.vat += x.vat; t.total += x.total;
    const r = (t.byRate[String(l.vatRate)] ??= { net: 0, vat: 0 });
    r.net += x.net; r.vat += x.vat;
  }
  return t;
}
