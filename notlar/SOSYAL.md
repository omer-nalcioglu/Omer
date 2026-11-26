# SOSYAL — Oturum Notları

> Kullanıcı yeni bir oturumda (başka hesapla bile) sadece **"sosyal"** yazarsa: bu dosyayı oku,
> bağlamı buradan yükle ve **soru sormadan** kaldığın yerden devam et. Yeni karar/bilgi oldukça bu
> dosyayı güncelle, kısa tut, commit + push et.

## Kullanıcının kalıcı kuralları (2026-11-26)
- **Soru sorma.** Kullanıcı uyurken/uzaktayken de iş yürüsün. Karar gerekirse en mantıklısını seç, notlara yaz.
- **Reklam yok, para harcanacak hiçbir şey yok.** Boost / öne çıkarma / ücretli araç YOK. Tamamen organik.
- **Hedef:** daha fazla izlenme + **Setiscar uygulamasının indirilme sayısını artırmak.**
- **Günde en az 6 Reels**, takipçilerin etkin olduğu saatlerde; daha fazlası serbest.
- **Her zaman ders çıkararak ilerle:** yeni videodan önce son videoların rakamlarına bak, işe yarayanı tekrarla.
- Türkçe konuş. Şifre/token bu dosyaya yazılmaz (depo GitHub'da).

## Setiscar nedir
- OBD-II araç arıza teşhis uygulaması. Mac'te proje: `/Users/omer/Documents/mobil oyun/drive_ai` (Flutter, bundle `com.driveai.driveAi`).
- App Store'da yayında: **1.0.2 (272)**. Ücretsiz, hesap gerekmez, OBD-II adaptörü gerekir.
- Özellikler (videolarda yalnızca bunlar iddia edilir): kod arama, kod ayrıntısı/anlamı (ör. P0420 = katalizör verimi düşük),
  Check-up, canlı göstergeler, CarPlay ekranı, kod silme, araç ana ekranı, demo modu. Demo değerler videoda **"DEMO · örnek değerler"** etiketli olur.
- Instagram: **instagram.com/setiscar.ai**

## Nasıl çalışıyoruz (Mac üzerinde)
- Paylaşım: Mac'teki Chrome'da (Claude in Chrome) giriş yapılmış **instagram.com/setiscar.ai** → Oluştur → Reels yükle → paylaş / zamanla.
- İstatistik: aynı yerden her Reels'in izlenme, erişim, takipçi-dışı oranı, beğeni/kaydetme/paylaşım verileri okunuyor.
- Notlar ve dosyalar Mac'te: `/Users/omer/Documents/mobil oyun/setiscar-notlar/`
  - `DEVAM-NOTU.md` (devam notu), `instagram/PLAN.md` (rakamlar + içerik kuralları)
  - Video üretici: `reels/v2/build.py` (imza şablonu, sahne türleri: adapter, phone[tap/hl/pan/demo], carplay, meter), çıktılar `reels/v2/out/`
  - Uygulama ekran görüntüleri: `reels/pro/a/tr-iphone-*.jpg`, `carplay.png`
- Kendi ürettiğimiz özgün müzik (112 BPM koyu elektronik), ses ≈ -16 LUFS. Telifli müzik yok.
- **Bulut oturumundan Mac'e erişim yok.** Otomatik paylaşım için Mac uyanık, Claude masaüstü açık, Chrome'da Instagram girişli olmalı.

## Rakamlar ve dersler (26 Kas itibarıyla)
| Video | İzlenme | Not |
|---|---|---|
| Arabada elde telefonla gerçek çekim | 2.121 | ~100 TL boost'luydu (artık reklam yok). 9 paylaşım |
| "BU IŞIK YANDI MI?" büyük harfli soru + lamba | 267 | En iyi organik. %78 takipçi dışı, 1 takipçi |
| Gece sürüşü, gerçek CarPlay | 162 | |
| Logo animasyonu | 161 | |
| P0420 telefon ekranı | 125 | |
| "Arıza lambası sabit mi yanıp sönüyor mu" (yazı ağırlıklı) | 114 / 1,5 sa | Etkileşim 0, kişi başı 1,8 izlenme |
| "Yeni özelliklerle geliştirildi" duyurusu | 117 | En zayıf, tekrarlama |

**Kurallar:** İlk saniyede BÜYÜK HARFLİ soru + tek büyük görsel (koyu araç fotoğrafı üstünde). Gerçek araç/uygulama görüntüsü çalışıyor.
"Yeni özellik" duyurusu çalışmıyor. 14–18 sn. Açıklamanın ilk satırı = videodaki soru. Tek net yorum çağrısı.
Hikâye kurgusu: sorun → çözüm, sessiz/gergin giriş → müzik, vuruşa kesme, 1/3-2/3 sayacı. Uzun yazı yok (etkileşimi öldürdü).

## Zamanlanmış / bekleyen
- Zamanlanmış Reels (19:00): 28 Kas "BU IŞIK YANDI, P0420 Mİ ÇIKTI?", 1 Ara "BU GİRİŞ ARABANIN NERESİNDE?", 3 Ara "ADAPTÖRÜN iPHONE'LA ÇALIŞIR MI?"
- Hazır, paylaşılmadı: `reels/v2/setiscar-uygulama-demo-lamba.mp4` (18,4 sn, gerçek ekranlarla demo: lamba → adaptör → Check-up → P0420 → canlı → CarPlay).
  Kullanıcı "reklam yok, soru sorma, paylaş" dedi → **ilk uygun etkin saatte paylaşılacak.**
- Simülatör "Setiscar Reels" (iPhone 17 Pro, iOS 26.5) kurulu; ekran kaydı izni verilmemişti.

## Günlük yayın planı (organik, günde 6+)
Türkiye saatiyle etkin saatler (Instagram "Hesap İstatistikleri → Takipçiler → En aktif saatler" verisi gelince güncelle):
**08:30 · 12:30 · 15:30 · 18:30 · 20:30 · 22:30** (+ isteğe bağlı 17:00, 23:30). Zamanlanmış 19:00 olanlar korunur.
İndirme için: profil bio'da App Store linki, her açıklamada "Link profilde · App Store'da Setiscar · ücretsiz, hesap gerekmez",
kapanış kartında "App Store'da SETISCAR ara". Yorum çağrısı: "Senin arabanda hangi kod çıktı? Yaz, anlamını söyleyeyim." (yorumlara cevap ver → erişim artar).
Organik büyütme (ücretsiz): her Reels'e 3–5 hashtag (#arızalambası #obd2 #carplay #arabatamiri #ikincielaraba), Hikâyelerde yeniden paylaş,
trend olmayan telifsiz özgün müzik, yorumlara hızlı cevap, kaydedilecek "liste" içerikleri.

### Hazır senaryolar (hepsi 14–18 sn, imza şablonu, gerçek uygulama ekranlarıyla)
1. **"BU KOD ÇIKTI: P0300. MOTOR TEKLİYOR MU?"** → ateşleme kaçırma → Setiscar'da kodu ara, anlamı → "Ustaya ne söyleyeceğini bil."
2. **"İKİNCİ EL ARABA ALIYORSUN. ÖNCE BUNU YAP."** → adaptörü tak → Check-up → kayıtlı kod var mı → "Pazarlıkta elin güçlenir." (kaydedilecek içerik)
3. **"P0171 NE DEMEK?"** → "karışım fakir" → olası basit sebepler (hava kaçağı vb., "kesin teşhis ustada" notuyla) → kod ayrıntısı ekranı.
4. **"AKÜN KIŞA HAZIR MI?"** → canlı göstergede voltaj (DEMO etiketi) → "Sabah çalışmadan önce gör."
5. **"BU GİRİŞ HER ARABADA VAR."** → OBD soketi yeri (direksiyon altı) → adaptör → telefon bağlandı.
6. **"LAMBAYI SİLDİN, PEKİ SORUN GİTTİ Mİ?"** → kod silme ekranı → "Kod geri gelirse sorun sürüyor." (dürüst bilgi)
7. **"MOTOR DEĞERLERİ ARAÇ EKRANINDA."** → CarPlay görüntüsü (DEMO etiketi) → "Vay be" anı.
8. **"USTAYA GİTMEDEN 30 SANİYE."** → hazır demo videosu (`setiscar-uygulama-demo-lamba.mp4`).
9. **"EN ÇOK GÖRÜLEN 5 ARIZA KODU"** → P0420, P0300, P0171, P0128, P0442 tek tek hızlı → "Kaydet, lazım olur."
10. **"P0128: MOTOR GEÇ ISINIYOR"** → termostat ihtimali → kışın neden önemli.
Her gün en iyi giden tarzdan bir tane daha üret; en zayıf tarzı ertesi gün bırak.

## Günlük ölçüm (her akşam 23:45)
Her Reels için: izlenme, erişim, takipçi-dışı %, ortalama izlenme süresi, beğeni/yorum/kaydetme/paylaşım, profil ziyareti, link tıklaması.
App Store Connect → indirme sayısı (günlük). Oranlar: paylaşım/izlenme, kaydetme/izlenme, profil ziyareti/izlenme, indirme/profil ziyareti.
Sonucu `instagram/PLAN.md` ve buraya tek satır olarak ekle; ertesi günün 6 videosunu en iyi 2 tarza göre üret.

## Kararlar / Günlük
- 2026-11-26: "Sosyal" hattı açıldı. Kullanıcı: reklam yok, soru yok, günde 6+ Reels, izlenme + indirme odaklı.
  Bulut oturumundan Mac'e bağlanılamadı (bağlı bilgisayar yok) → bugünkü paylaşım yapılamadı; plan ve senaryolar hazırlandı.

## Depodaki diğer ürünler (omer-nalcioglu/omer)
`workflow/` (işletme operasyon platformu), `halloldu/` (iş takip), `minik-dunya/` (çocuk oyunu). Hepsi tek dosya HTML prototip.
