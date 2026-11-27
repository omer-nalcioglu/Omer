# Workflow

İş takip uygulaması: iş akışları, görev atama, onay, bildirim; e-Fatura, WhatsApp ve tahsilat entegrasyonlarına hazır mimari.

- `apps/mobile` · iOS/Android uygulaması (Expo)
- `packages/core` · iş akışı motoru (telefon ve sunucu ortak)
- `supabase` · veritabanı şeması, sunucu fonksiyonları, entegrasyon adaptörleri
- `docs/ARCHITECTURE.md` · mimari

```bash
npm install
npm test                 # motor testleri
npm run typecheck
cd apps/mobile && npx expo start
```
