/**
 * Akışa özel alanlar. Her akış kendi alanlarını tanımlar (ör. klima: BTU, marka);
 * iş verisi `job.data` içinde durur ve hem telefonda hem sunucuda aynı kurallarla doğrulanır.
 */
export type FieldType = "text" | "number" | "select" | "date" | "bool" | "phone";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  unit?: string;
  /** Bu aşama bitmeden önce doldurulmuş olmalı; yoksa iş açılırken zorunludur ("create"). */
  requiredAt?: "create" | string;
  /** Müşteri takip ekranında görünür mü */
  customerVisible?: boolean;
}

export type FieldValue = string | number | boolean | null;
export type JobData = Record<string, FieldValue>;

export interface FieldError { key: string; message: string }

export function validateFields(defs: FieldDef[], data: JobData, at: "create" | string): FieldError[] {
  const errs: FieldError[] = [];
  for (const d of defs) {
    const v = data[d.key];
    const empty = v === undefined || v === null || v === "";
    if (d.requiredAt === at && empty) { errs.push({ key: d.key, message: `${d.label} gerekli` }); continue; }
    if (empty) continue;
    if (d.type === "number" && (typeof v !== "number" || Number.isNaN(v))) errs.push({ key: d.key, message: `${d.label} sayı olmalı` });
    if (d.type === "select" && d.options && !d.options.includes(String(v))) errs.push({ key: d.key, message: `${d.label} listede yok` });
    if (d.type === "bool" && typeof v !== "boolean") errs.push({ key: d.key, message: `${d.label} evet/hayır olmalı` });
    if (d.type === "date" && (typeof v !== "string" || Number.isNaN(Date.parse(v)))) errs.push({ key: d.key, message: `${d.label} tarih olmalı` });
  }
  return errs;
}
