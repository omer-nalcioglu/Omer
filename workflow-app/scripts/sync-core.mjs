// Çekirdek motoru sunucu fonksiyonlarına kopyalar (Supabase Edge Functions yalnızca kendi klasörünü paketler).
// Telefon ve sunucu aynı motoru çalıştırır; `npm run sync-core` her dağıtımdan önce çalışır.
import { cpSync, rmSync, writeFileSync } from "node:fs";
const dst = "supabase/functions/_shared/core";
rmSync(dst, { recursive: true, force: true });
cpSync("packages/core/src", dst, { recursive: true });
writeFileSync(`${dst}/README.md`, "Bu klasör otomatik üretilir: packages/core/src kopyasıdır. Elle düzenleme; `npm run sync-core`.\n");
console.log("core →", dst);
