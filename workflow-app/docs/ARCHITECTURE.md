# Workflow · Mimari

Amaç: bugün yazdığımız hiçbir şey, yarın e-Fatura, WhatsApp, SMS, online tahsilat, muhasebe ya da başka bir
entegrasyon eklenirken yeniden yazılmasın. Bunun için uygulama dört katmana ayrıldı ve katmanlar birbirini
yalnızca tanımlı arayüzlerden tanıyor.

```
┌──────────────── apps/mobile (Expo, React Native, iOS/Android) ────────────────┐
│ ekranlar (src/app)  →  eylemler (src/data/store.ts)  →  @workflow/core motoru │
│                                   │ çevrimdışı kuyruk (pending events)         │
└───────────────────────────────────┼───────────────────────────────────────────┘
                                    │ HTTPS: apply-command (komut), Realtime (okuma)
┌───────────────────────── supabase (Postgres + Auth + Edge) ───────────────────┐
│ apply-command: yetki + aynı motor + commit_job()  ──►  jobs, events, outbox    │
│ dispatch (dakikada bir): outbox ► subscriptions ► adaptörler ► dış sistemler   │
│ inbound: WhatsApp / ödeme / e-Fatura webhook'ları ► imza doğrula ► iç model    │
└────────────────────────────────────────────────────────────────────────────────┘
          adaptörler: whatsapp_cloud · netgsm · parasut · logo_isbasi · uyumsoft · iyzico · mock
```

## 1. Çekirdek: `packages/core`
- Saf TypeScript, hiçbir bağımlılık yok. Telefon (çevrimdışı) ve sunucu (doğrulama) aynı kodu çalıştırır.
- **Akış = grafik.** Aşamalar düğüm, `next` ve karar dalları kenar. Paralel çalışma, birleşme (`join: all | any`),
  koşullu dal, döngü (geri dönen dal), geri gönderme motorda hazır.
- **Aşama türleri:** iş, onay, karar, dışarıyı bekle, süre bekle, randevu, sevkiyat, teslimat, **fatura**,
  **tahsilat**, **alt iş**, **otomatik bildirim**. Yeni tür eklemek motorun davranış tablosuna bir satırdır.
- **Akışa özel alanlar** (`fields.ts`): her akış kendi alanlarını tanımlar, hangi aşamada zorunlu olduğunu söyler.
- **Kurallar** (`rules.ts`): veri olarak saklanan "EĞER … İSE …". Motor yalnızca kendi işini değiştiren eylemleri
  uygular; diğerleri (bildir, mesaj gönder, görev aç) **olay** olur.
- **Olaylar** (`events.ts`): her değişiklik olay üretir. Entegrasyonlar olaylara abone olur, motora dokunmaz.
- **Para** (`money.ts`): kuruş cinsinden tam sayı; KDV ve toplamlar UBL-TR ile uyumlu.
- **Portlar** (`integrations/ports.ts`): `InvoiceProvider`, `MessagingChannel`, `PaymentProvider`. Uygulama
  sağlayıcı adı bilmez; yalnızca bu arayüzleri bilir.
- Testler: `npm test` (karar, döngü, paralel, zamanlayıcı, fatura/tahsilat olayları, zorunlu alan, KDV).

## 2. Veri: `supabase/migrations`
- **Çoklu işletme:** her satırda `business_id`; erişim **RLS** ile üyeliğe ve yetki grubuna bağlı.
- **Sürümlü akış:** `flow_versions`. İş açıldığı sürüme bağlı kalır; akışı değiştirmek süren işi bozmaz.
- **İş durumu** `jobs.stages` (jsonb) içinde, motorun `StageRun` haritası; `version` ile iyimser kilit
  (çevrimdışı eşitlemede çakışma 409 döner, telefon yeniden dener).
- **events** değişmez denetim kaydı; **outbox** aynı işlemde yazılır (`commit_job`). Olay kaybolmaz, iki kez
  gönderilmez (`idempotency_key`).
- **integrations**: hangi işletme hangi sağlayıcıyı kullanıyor. Anahtarlar **Supabase Vault**'ta; telefona inmez.
- **subscriptions**: hangi olay hangi eyleme gider. Yeni otomasyon = yeni satır, kod değişmez.
- **invoices / payments / threads / messages**: fatura (UBL-TR alanları), tahsilat, sohbet ve WhatsApp köprüsü.

## 3. Sunucu: `supabase/functions`
- `apply-command`: işi değiştiren tek kapı. Kullanıcı → üyelik → yetki → motor → `commit_job`.
- `dispatch`: outbox'tan bekleyenleri alır, aboneliklere göre adaptöre yollar; artan beklemeyle 8 kez dener,
  sonra `dead` olur ve görünür kalır. Her deneme `integration_logs`'a yazılır.
- `inbound`: gelen webhook'lar. WhatsApp imzası (`X-Hub-Signature-256`) doğrulanmadan hiçbir şey yazılmaz;
  gelen müşteri mesajı ilgili sohbete düşer.
- `_shared/adapters`: `whatsapp_cloud` hazır; Paraşüt, Logo İşbaşı, Uyumsoft, Netgsm, iyzico arayüzü sabit iskelet
  (sözleşme ve test hesabı gelince doldurulur, seçilirse açık hata verir, sessizce kaybolmaz).
- `npm run sync-core`: çekirdeği fonksiyonlara kopyalar (telefon ve sunucu aynı motoru çalıştırır).

## 4. Telefon: `apps/mobile`
- Expo SDK 58, Expo Router, TypeScript. Tasarım dili tek dosyada (`src/theme/tokens.ts`, `src/ui/kit.tsx`).
- Ekranlar yalnızca `src/data/store.ts` eylemlerini çağırır. Bugün "örnek işletme" telefonda çalışır; bulut
  modunda aynı eylemler `src/data/remote.ts` üzerinden `apply-command`'a gider. Ekranlar değişmez.
- Kalıcı depolama SQLite (çevrimdışı); oturum anahtarı SecureStore'da.
- Derleme ve dağıtım EAS ile (`eas.json`): `development`, `preview`, `production` (TestFlight).

## Yeni bir entegrasyon nasıl eklenir (örnek: e-Fatura için X sağlayıcısı)
1. `supabase/functions/_shared/adapters/x.ts`: `InvoiceProvider` arayüzünü uygula.
2. `registry.ts`'e bir satır ekle.
3. İşletme ayarlarında sağlayıcıyı seç; anahtar Vault'a yazılır, `integrations` satırı oluşur.
4. `subscriptions`: `invoice.requested → issue_invoice`. Motor, ekranlar ve veritabanı şeması değişmez.

## Yol haritasıyla ilişkisi
Plan belgesindeki Faz 1 (dal, yeni aşama türleri, özel alan, tekrarlayan iş, onay kutusu, müşteri linki)
motor tarafında büyük ölçüde hazır; eksik olan akış tasarlayıcısı ekranı, tekrarlayan iş zamanlayıcısı ve
bulut modunun ekranlara bağlanmasıdır.
