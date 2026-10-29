// Arayüz çevirisi (İngilizce -> Türkçe).
// Kodda metinler İngilizce yazılır. Türkçe modda sayfadaki metinler ve erişilebilirlik öznitelikleri bu sözlükle
// çevrilir; sonradan eklenen (yeniden çizilen) içerik de otomatik çevrilir.
// Yeni bir metin eklenince karşılığını EXACT (sabit metin) ya da PATTERNS (değişken içeren metin) içine ekle.
// Çevrilmemesi gereken yerlere translate="no" yaz (ör. look adları).
window.I18N = (() => {
  let lang = "en";

  const EXACT = {
    // genel çerçeve
    "ALTÉ — Choose the Look": "ALTÉ — Look'unu Seç",
    "Twelve head-to-toe looks in a rotating showroom. Turn the room, pick a look, shop every piece.":
      "Dönen bir showroom'da tepeden tırnağa on iki look. Odayı çevir, bir look seç, her parçayı satın al.",
    "Find a store": "Mağazalar", "Help": "Yardım", "Join us": "Üye ol", "Sign in": "Giriş yap",
    "Utility": "Yardımcı bağlantılar", "Language and currency": "Dil ve para birimi",
    "Looks": "Looklar", "New": "Yeni", "Clothing": "Giyim", "Footwear": "Ayakkabı", "Accessories": "Aksesuar",
    "Open menu": "Menüyü aç", "Close menu": "Menüyü kapat", "Menu": "Menü", "Menu links": "Menü bağlantıları",
    "ALTÉ home": "ALTÉ ana sayfa", "Primary": "Ana menü", "Search": "Ara",
    "Dark theme": "Karanlık tema", "Bag": "Sepet",

    // showroom
    "Choose the look.": "Look'unu seç.",
    "Twelve looks, head to toe. Drag to turn the room, tap the front look to shop it.":
      "On iki look, tepeden tırnağa. Odayı çevirmek için sürükle, alışveriş yapmak için öndeki looka dokun.",
    "View": "Gör",
    "In this look": "Bu lookta", "Back to all looks": "Tüm looklara dön", "Share this look": "Bu looku paylaş",
    "Complete the look": "Looku tamamla", "Add full look to bag": "Tüm looku sepete ekle",
    "Previous look": "Önceki look", "Next look": "Sonraki look",
    "Pause autoplay": "Otomatik geçişi durdur", "Play autoplay": "Otomatik geçişi başlat",
    "Link copied": "Bağlantı kopyalandı",
    "Copy the link from the address bar": "Bağlantıyı adres çubuğundan kopyala",

    // sepet
    "Close bag": "Sepeti kapat",
    "Your bag is empty. Open a look and tap + on a piece to add it.":
      "Sepetin boş. Bir look aç ve eklemek için bir parçanın yanındaki + işaretine dokun.",
    "Subtotal": "Ara toplam", "Look bundle savings": "Look paketi indirimi", "Total": "Toplam",
    "Checkout": "Ödeme",
    "Demo / portfolio project. Products, prices, stock and images are samples.": "Demo / portfolyo projesi. Ürünler, fiyatlar, stok ve görseller örnektir.",
    "Size guide": "Beden rehberi", "Close size guide": "Beden rehberini kapat",
    "Chest (cm)": "Göğüs (cm)", "Length (cm)": "Boy (cm)", "Height (cm)": "Kişi boyu (cm)", "Waist (cm)": "Bel (cm)", "Inseam (cm)": "İç bacak (cm)",
    "Foot length (cm)": "Ayak uzunluğu (cm)",
    "Measure your foot from heel to longest toe and match it to the foot length. Between sizes? Take the larger one.":
      "Ayağını topuktan en uzun parmağa kadar ölç ve ayak uzunluğu sütunuyla eşleştir. İki beden arasında kaldıysan büyük olanı al.",
    "Body measurements. Our fits are relaxed and oversized; between sizes, size down for a closer fit.":
      "Vücut ölçüleridir. Kalıplarımız rahat ve oversize; iki beden arasında kaldıysan daha oturaklı bir görünüm için küçük bedeni seç.",
    "In stock": "Stokta", "Sold out": "Tükendi", "This size is sold out": "Bu beden tükendi",
    "Recently viewed": "Son baktıkların", "Clear": "Temizle",
    "Size": "Beden", "One size": "Tek beden",
    "Decrease quantity": "Adedi azalt", "Increase quantity": "Adedi artır", "Remove": "Kaldır",
    "Removed from bag": "Sepetten kaldırıldı", "This look is already in your bag": "Bu look zaten sepetinde",

    // ürün sayfası
    "Product": "Ürün", "Product view": "Ürün görünümü", "Full look view": "Tüm look görünümü",
    "Color": "Renk", "Select size": "Beden seç",
    "Select a size to add this piece to your bag.": "Bu parçayı sepete eklemek için bir beden seç.",
    "Add to bag": "Sepete ekle",
    "Heavyweight, garment-washed fabric cut loose through the body. Made to be layered and worn in.":
      "Ağır gramajlı, yıkamalı kumaş ve bol bir kesim. Katmanlı giyilmek ve zamanla yumuşamak için tasarlandı.",
    "A cushioned sole and a clean, low profile. Everyday comfort that keeps its shape.":
      "Yastıklı bir taban ve sade, alçak bir profil. Şeklini koruyan günlük konfor.",
    "The finishing piece. Worn in, easy to style, made to sit with the rest of the look.":
      "Looku tamamlayan parça. Kullanılmış bir his verir, kolay kombinlenir, diğer parçalarla uyum içinde durur.",
    "Relaxed, oversized fit": "Rahat, oversize kesim", "Garment-washed cotton blend": "Yıkamalı pamuk karışımı",
    "Machine wash cold": "Soğuk suda makinede yıka", "True to size": "Standart beden",
    "Leather and textile upper": "Deri ve tekstil üst yapı", "Rubber outsole": "Kauçuk taban",
    "Adjustable fit": "Ayarlanabilir", "Cotton blend": "Pamuk karışımı", "Spot clean": "Yalnızca leke temizliği",
    "Product details": "Ürün detayları", "Shipping and returns": "Kargo ve iade",

    // liste sayfaları
    "Shop": "Mağaza", "Breadcrumb": "Gezinti yolu",
    "Hide Filters": "Filtreleri gizle", "Show Filters": "Filtreleri göster", "Filters": "Filtreler",
    "Close filters": "Filtreleri kapat", "Sort by": "Sırala",
    "Featured": "Öne çıkanlar", "Price: Low to High": "Fiyat: Artan", "Price: High to Low": "Fiyat: Azalan",
    "Category": "Kategori", "Price": "Fiyat", "Just In": "Yeni geldi", "Clear all": "Tümünü temizle",
    "No pieces match": "Eşleşen parça yok", "Try removing a filter to see more.": "Daha fazlasını görmek için bir filtreyi kaldır.",
    "Clear filters": "Filtreleri temizle",

    // arama
    "Close search": "Aramayı kapat", "Search results": "Arama sonuçları", "No results found": "Sonuç bulunamadı",
    "Check the spelling or try a more general word.": "Yazımı kontrol et ya da daha genel bir kelime dene.",
    "Browse new arrivals": "Yeni gelenlere göz at",

    // ürün alanı ve bilgi sayfaları
    "See all filters": "Tüm filtreleri gör",
    "All products": "Tüm ürünler", "All tops": "Tüm üst giyim", "All bottoms": "Tüm alt giyim", "Product type": "Ürün türü",
    "Sweatshirts": "Sweatshirt", "T-shirts": "Tişört", "Jackets": "Ceket",
    "Shorts": "Şort", "Jeans": "Kot", "Sweatpants": "Eşofman", "Pants": "Pantolon",
    "All": "Hepsi", "Tops": "Üst giyim", "Bottoms": "Alt giyim", "Pagination": "Sayfalama", "Previous page": "Önceki sayfa", "Next page": "Sonraki sayfa",
    "Answers to the questions we hear most.": "En sık sorulan soruların yanıtları.",
    "How long does shipping take?": "Kargo ne kadar sürer?",
    "Can I return an item?": "Ürün iade edebilir miyim?",
    "How do I find my size?": "Bedenimi nasıl bulurum?",
    "Which payment methods do you accept?": "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
    "Can I change my order?": "Siparişimi değiştirebilir miyim?",
    "How do I contact you?": "Size nasıl ulaşırım?",
    "Yes. Return unworn pieces within 30 days for a full refund.": "Evet. Giyilmemiş parçaları 30 gün içinde tam iadeyle geri gönderebilirsin.",
    "Every product page lists the available sizes. Our fits are relaxed and oversized, so most people stay true to size.":
      "Her ürün sayfasında mevcut bedenler yazıyor. Kesimlerimiz rahat ve oversize; çoğu kişi kendi bedeninde kalıyor.",
    "This is a demo store, so no real payments are taken. A live store would list cards and local payment methods here.":
      "Bu bir demo mağazadır, gerçek ödeme alınmaz. Canlı bir mağazada burada kartlar ve yerel ödeme yöntemleri listelenir.",
    "You can change or cancel an order until it is packed. Contact us as soon as possible.":
      "Siparişi paketlenene kadar değiştirebilir ya da iptal edebilirsin. Mümkün olan en kısa sürede bize ulaş.",
    "Write to support@alte.example and we will reply within one business day.":
      "support@alte.example adresine yaz, bir iş günü içinde yanıt verelim.",
    "Visit a ALTÉ store to try the looks in person.": "Looklara yerinde göz atmak için bir ALTÉ mağazasını ziyaret et.",
    "Open daily 10:00 to 22:00": "Her gün 10:00 - 22:00 açık",
    "These are sample locations for the demo.": "Bunlar demo için örnek konumlardır.",
    "Create a free membership to hear about new drops first.": "Yeni drop'lardan ilk senin haberin olsun diye ücretsiz üyelik oluştur.",
    "Create membership": "Üyelik oluştur",
    "This is a demo store. No account is created and nothing is saved.": "Bu bir demo mağazadır. Hesap oluşturulmaz ve hiçbir şey kaydedilmez.",
    "Enter your email and we will send you a sign-in link.": "E-postanı gir, sana bir giriş bağlantısı gönderelim.",
    "Send link": "Bağlantı gönder",
    "This is a demo store, so no email is sent.": "Bu bir demo mağazadır, e-posta gönderilmez.",
    "Welcome.": "Hoş geldin.", "Link sent.": "Bağlantı gönderildi.",
    "This is a demo store. No account was created and nothing was saved.": "Bu bir demo mağazadır. Hesap oluşturulmadı ve hiçbir şey kaydedilmedi.",
    "This is a demo store, so no email was sent.": "Bu bir demo mağazadır, e-posta gönderilmedi.",

    // favoriler
    "Favorites": "Favoriler", "Saved looks": "Kaydedilen looklar",
    "Save this look to favorites": "Bu looku favorilere kaydet",
    "Saved to favorites": "Favorilere kaydedildi", "Removed from favorites": "Favorilerden kaldırıldı",
    "No favorites yet": "Henüz favorin yok",
    "Tap the heart on a piece or a look to save it here.": "Buraya kaydetmek için bir parçadaki ya da lookdaki kalbe dokun.",
    "No saved pieces yet": "Henüz kayıtlı parça yok",
    "Tap the heart on a piece to save it here.": "Buraya kaydetmek için bir parçadaki kalbe dokun.",

    // ödeme
    "Back to shopping": "Alışverişe dön", "Back to looks": "Looklara dön",
    "Your bag is empty": "Sepetin boş",
    "Open a look, pick a piece and add it to your bag. It will show up here.":
      "Bir look aç, bir parça seç ve sepetine ekle. Burada görünecek.",
    "Contact": "İletişim", "Email": "E-posta", "Delivery address": "Teslimat adresi",
    "First name": "Ad", "Last name": "Soyad", "Street address": "Adres",
    "Apartment, suite, unit": "Daire, kat, bina no", "(optional)": "(isteğe bağlı)",
    "City": "Şehir", "State or region": "İl veya bölge", "Postal code": "Posta kodu", "Country": "Ülke", "Phone": "Telefon",
    "Shipping method": "Kargo yöntemi", "Standard": "Standart", "Express": "Hızlı",
    "3 to 5 business days": "3 ila 5 iş günü", "1 to 2 business days": "1 ila 2 iş günü",
    "Free": "Ücretsiz", "Shipping": "Kargo", "Payment": "Ödeme",
    "This is a demo store. Card details stay in your browser and no payment is taken.":
      "Bu bir demo mağazadır. Kart bilgileri tarayıcında kalır ve ödeme alınmaz.",
    "Card number": "Kart numarası", "Name on card": "Kart üzerindeki isim", "Expiry": "Son kullanma",
    "Security code": "Güvenlik kodu", "MM/YY": "AA/YY",
    "Place order": "Siparişi ver", "Placing order": "Sipariş veriliyor", "Order summary": "Sipariş özeti",
    "Enter a valid email address.": "Geçerli bir e-posta adresi gir.",
    "Enter your first name.": "Adını gir.", "Enter your last name.": "Soyadını gir.",
    "Enter your street address.": "Adresini gir.", "Enter your city.": "Şehrini gir.",
    "Enter your state or region.": "İl veya bölgeni gir.", "Enter a postal code.": "Posta kodunu gir.",
    "Enter a valid phone number.": "Geçerli bir telefon numarası gir.",
    "Enter a valid card number.": "Geçerli bir kart numarası gir.",
    "Enter the name on your card.": "Kart üzerindeki ismi gir.",
    "Use the format MM/YY.": "AA/YY biçimini kullan.", "Enter a valid month.": "Geçerli bir ay gir.",
    "This card has expired.": "Bu kartın süresi dolmuş.", "Enter the 3 or 4 digit code.": "3 veya 4 haneli kodu gir.",
    "Order confirmed.": "Sipariş alındı.", "is on its way to being packed.": "hazırlanıyor.",
    "Delivery": "Teslimat", "Your order": "Siparişin",
    "This is a demo store. No payment was taken and no confirmation email is sent.":
      "Bu bir demo mağazadır. Ödeme alınmadı ve onay e-postası gönderilmez.",
    "Continue shopping": "Alışverişe devam et",

    // ülkeler
    "United States": "Amerika Birleşik Devletleri", "United Kingdom": "Birleşik Krallık", "Canada": "Kanada",
    "Germany": "Almanya", "France": "Fransa",

    // renkler
    "Red": "Kırmızı", "Butter": "Tereyağı sarısı", "Violet Wash": "Yıkamalı mor", "Black": "Siyah",
    "Off White": "Kırık beyaz", "Blush": "Pudra pembesi", "Cream": "Krem", "Camo": "Kamuflaj", "Lemon": "Limon",
    "White": "Beyaz", "Mocha": "Kahve", "Washed Black": "Yıkamalı siyah", "Wheat": "Buğday sarısı",
    "Heather Grey": "Melanj gri", "Oatmeal": "Yulaf", "Cobalt": "Kobalt", "Light Grey": "Açık gri", "Stone": "Taş",
    "Light Indigo": "Açık indigo", "Pink": "Pembe", "Woodland": "Orman kamuflajı", "Forest": "Orman yeşili", "Navy": "Lacivert"
  };

  // [düzenli ifade, (eşleşme, çevir) => çeviri]; "çevir" bir parçayı sözlükten çevirir, bulamazsa aynen bırakır
  const PATTERNS = [
    [/^(\d+) pieces?$/, (m) => `${m[1]} parça`],
    [/^Bundle all (\d+) and save (\d+)%$/, (m) => `${m[1]} parçanın hepsini al, %${m[2]} kazan`],
    [/^Look (\d+), (.+), (\d+) of (\d+)$/, (m) => `Look ${m[1]}, ${m[2]}, ${m[3]} / ${m[4]}`],
    [/^Added look (\d+) to bag, (\d+)% off applied$/, (m) => `Look ${m[1]} sepete eklendi, %${m[2]} indirim uygulandı`],
    [/^Added (.+?)(?: \(([^)]+)\))? to bag$/, (m) => `${m[1]}${m[2] ? ` (${m[2]})` : ""} sepete eklendi`],
    [/^Bag, (\d+) items?$/, (m) => `Sepet, ${m[1]} ürün`],
    [/^View (.+)$/, (m) => `${m[1]} ürününü gör`],
    [/^(.+) is in your bag, open bag$/, (m) => `${m[1]} sepetinde, sepeti aç`],
    [/^Add (.+) more to get free standard shipping\.$/, (m) => `Ücretsiz standart kargo için ${m[1]} daha ekle.`],
    [/^Add (.+) to bag$/, (m) => `${m[1]} ürününü sepete ekle`],
    [/^Size for (.+)$/, (m) => `${m[1]} bedeni`],
    [/^Quantity for (.+)$/, (m) => `${m[1]} adedi`],
    [/^Quantity (\d+)$/, (m) => `Adet ${m[1]}`],
    [/^(.+), (XS|S|M|L|XL|US \d+)$/, (m, t) => `${t(m[1])}, ${m[2]}`],
    [/^Remove filter (.+)$/, (m, t) => `${t(m[1])} filtresini kaldır`],
    [/^Show (\d+) results$/, (m) => `${m[1]} sonucu göster`],
    [/^See all (\d+) results$/, (m) => `Tüm ${m[1]} sonucu gör`],
    [/^Page (\d+)$/, (m) => `Sayfa ${m[1]}`],
    [/^Save (.+) to favorites$/, (m) => `${m[1]} ürününü favorilere kaydet`],
    [/^Favorites, (\d+) items?$/, (m) => `Favoriler, ${m[1]} ürün`],
    [/^No results for “(.+)”$/, (m) => `“${m[1]}” için sonuç yok`],
    [/^Results for “(.+)”$/, (m) => `“${m[1]}” için sonuçlar`],
    [/^Back to (.+)$/, (m, t) => `Geri: ${t(m[1])}`],
    [/^From Look (\d+), (.+)$/, (m) => `Kaynak look: Look ${m[1]}, ${m[2]}`],
    [/^Color shown: (.+)$/, (m, t) => `Gösterilen renk: ${t(m[1])}`],
    [/^Style: (.+)$/, (m) => `Model: ${m[1]}`],
    [/^Free shipping on orders over (.+)\. Free returns within 30 days\.$/,
      (m) => `${m[1]} ve üzeri siparişlerde ücretsiz kargo. 30 gün içinde ücretsiz iade.`],
    [/^Free shipping on orders over (.+)$/, (m) => `${m[1]} ve üzeri siparişlerde ücretsiz kargo`],
    [/^Free shipping over (.+)$/, (m) => `${m[1]} üzeri ücretsiz kargo`],
    [/^Free standard shipping on orders over (.+)\. Return unworn pieces within 30 days for a full refund\.$/,
      (m) => `${m[1]} ve üzeri siparişlerde standart kargo ücretsiz. Giyilmemiş parçaları 30 gün içinde tam iadeyle geri gönderebilirsin.`],
    [/^Under (\D?\d[\d.,]*)$/, (m) => `${m[1]} altı`],
    [/^(\D?\d[\d.,]*) to (\D?\d[\d.,]*)$/, (m) => `${m[1]} ile ${m[2]} arası`],
    [/^(\D?\d[\d.,]*) and up$/, (m) => `${m[1]} ve üzeri`],
    [/^Thanks, (.+)\. Order$/, (m) => `Teşekkürler, ${m[1]}. Sipariş`],
    [/^Thanks, (.+)\. Your membership is ready\.$/, (m) => `Teşekkürler, ${m[1]}. Üyeliğin hazır.`],
    [/^We would email a sign-in link to (.+)\.$/, (m) => `${m[1]} adresine bir giriş bağlantısı e-postalardık.`],
    [/^Standard shipping takes 3 to 5 business days\. Express takes 1 to 2 business days\. Orders over (.+) ship free\.$/,
      (m) => `Standart kargo 3 ila 5 iş günü sürer. Hızlı kargo 1 ila 2 iş günü sürer. ${m[1]} üzeri siparişlerde kargo ücretsizdir.`],
    [/^(Standard|Express) shipping, (.+)\.$/, (m, t) => `${m[1] === "Express" ? "Hızlı" : "Standart"} kargo, ${t(m[2])}.`],
    [/^Only (\d+) left in this size$/, (m) => `Bu bedenden yalnızca ${m[1]} adet kaldı`],
    [/^Only (\d+) left in size (.+)$/, (m) => `${m[2]} bedeninden yalnızca ${m[1]} adet kaldı`],
    [/^Only (\d+) left$/, (m) => `Yalnızca ${m[1]} adet kaldı`],
    [/^(.+), sold out$/, (m) => `${m[1]}, tükendi`],
    [/^(.+) — ALTÉ$/, (m, t) => `${t(m[1])} — ALTÉ`],
    [/^(.+) \/ (.+)$/, (m, t) => `${t(m[1])} / ${t(m[2])}`]
  ];

  // Metni çevirir; karşılığı yoksa null döner
  function str(s) {
    const key = s.trim();
    if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(EXACT, key)) return EXACT[key];
    for (const [re, fn] of PATTERNS) {
      const m = re.exec(key);
      if (m) return fn(m, t);
    }
    return null;
  }
  function t(s) { const r = str(s); return r === null ? s : r; }

  /* ---------- DOM çevirisi ---------- */
  const ATTRS = ["aria-label", "placeholder", "title", "alt", "content"];
  const origText = new WeakMap();   // metin düğümü -> özgün (İngilizce) metin
  const written = new WeakMap();    // metin düğümü -> en son bizim yazdığımız metin
  const origAttr = new WeakMap();   // eleman -> { öznitelik: { orig, written } }

  const skipEl = (el) => !!(el && el.closest && el.closest('[translate="no"], script, style, textarea'));

  function doText(node) {
    if (skipEl(node.parentElement)) return;
    let src = origText.get(node);
    // uygulama metni kendisi değiştirdiyse yeni İngilizce metin özgün kabul edilir
    if (src === undefined || node.nodeValue !== written.get(node)) { src = node.nodeValue; origText.set(node, src); }
    let out = src;
    if (lang !== "en") {
      const r = str(src);
      if (r !== null) out = src.replace(src.trim(), () => r);
    }
    written.set(node, out);
    if (node.nodeValue !== out) node.nodeValue = out;
  }

  function doAttrs(el) {
    if (skipEl(el)) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      let rec = origAttr.get(el);
      if (!rec) { rec = {}; origAttr.set(el, rec); }
      const cur = el.getAttribute(a);
      let r = rec[a];
      if (!r || cur !== r.written) r = rec[a] = { orig: cur, written: cur };
      let out = r.orig;
      if (lang !== "en") { const tr = str(r.orig); if (tr !== null) out = tr; }
      r.written = out;
      if (cur !== out) el.setAttribute(a, out);
    }
  }

  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || skipEl(root)) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && skipEl(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }

  // Türkçe modda sonradan eklenen / değişen içerik otomatik çevrilir
  new MutationObserver((records) => {
    if (lang === "en") return;
    for (const r of records) {
      if (r.type === "childList") r.addedNodes.forEach(walk);
      else if (r.type === "characterData") doText(r.target);
      else if (r.type === "attributes") doAttrs(r.target);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  function setLang(next) {
    lang = next;
    document.documentElement.lang = next;
    walk(document.documentElement);
  }

  return { setLang, t, get lang() { return lang; } };
})();
