# ALTÉ Streetwear vitrini (yayın kopyası)

Giyim mağazası vitrini: döner bir showroom, look'lardan parça satın alma, sepet, ödeme (demo), arama, favoriler, beden rehberi, stok bilgisi, son baktıkların, Türkçe/İngilizce ve karanlık tema.

Bu klasör, `kiyafet-showroom` projesinin **yayına hazırlanmış kopyasıdır**. Yayın için gereken her şey bu klasörün içindedir; ek derleme adımı yoktur (düz HTML, CSS ve JS).

## Canlı site

https://altayilmazz.github.io/alte-showroom/

## Ekran görüntüleri

(İstersen buraya `docs/` klasörüne koyduğun ekran görüntülerini ekle.)

## Görseller

`assets/looks/` içindeki 12 görsel, gri neon dış çizgili **yer tutucu silüetlerdir**. Orijinal look fotoğrafları (telif hakkı olan görseller) bu kopyada **yoktur** ve bu klasörle birlikte yayınlanmamalıdır. Orijinal görseller yalnızca yerel `kiyafet-showroom` klasöründe durur.

Kendi fotoğraflarını kullanmak için şeffaf arka planlı görselleri aynı adlarla (`look-01.webp` ... `look-12.webp`) bu klasöre koy. Boyutları farklıysa parça kırpma ve pin konumlarını `js/data.js` içinde ayarla.

`assets/brand/` içinde logo, favicon, telefon ikonu ve paylaşım önizleme görseli (`og.png`) durur.

## Yayına alırken

- Paylaşım görseli adresleri (`og:image`, `twitter:image`, `og:url`) GitHub Pages adresine göre yazıldı; site başka bir adrese taşınırsa `index.html` içinde güncelle.
- Klasörün tamamını Netlify, Vercel ya da GitHub Pages gibi bir statik barındırmaya yükle. `dev-server.js` yalnızca yerel geliştirme içindir, yayına gerekmez.

## Yerelde çalıştırma

```
node dev-server.js
```

Sonra tarayıcıda `http://localhost:5391` adresini aç (başka port için `node dev-server.js 5393`). Dosyaları kaydedince sayfa kendiliğinden yenilenir.

## Notlar

- Ürün adları, fiyatlar, stok adetleri, mağaza adresleri ve e-posta adresi örnektir.
- Ödeme, üyelik ve giriş formları demodur; hiçbir veri gönderilmez ya da saklanmaz.
- Kur örnektir: `js/app.js` içindeki `TRY_PER_USD`.
