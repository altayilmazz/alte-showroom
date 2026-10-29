(() => {
  const LOOKS = window.LOOKS;
  const N = LOOKS.length;
  const STEP = (Math.PI * 2) / N;
  const AUTOPLAY_MS = 6000;
  const BUNDLE_OFF = 0.10;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (s, el = document) => el.querySelector(s);
  const showroom = $(".showroom");
  const pageEl = $("[data-page]");               // showroom + ürün alanı; üstte bir sayfa açılınca etkisizleştirilir
  const stage = $("[data-stage]");
  const ringEl = $("[data-ring-items]");
  const dotsEl = $("[data-dots]");
  const panel = $("[data-panel]");
  const piecesEl = $("[data-pieces]");
  const bagCount = $("[data-bag-count]");
  const toastEl = $("[data-toast]");

  /* ---------- Language and currency ---------- */
  // Dil değişince para birimi de değişir (EN: USD, TR: TRY). Fiyatlar USD olarak tutulur, gösterilirken çevrilir.
  const TRY_PER_USD = 40;                      // örnek kur; gerçek kura göre güncelle
  const LANG_KEY = "lobby-lang";
  const CURRENCY = {
    en: { code: "USD", rate: 1, locale: "en-US" },
    tr: { code: "TRY", rate: TRY_PER_USD, locale: "tr-TR" }
  };
  let lang = "en";
  try { lang = localStorage.getItem(LANG_KEY) || ((navigator.language || "").toLowerCase().startsWith("tr") ? "tr" : "en"); } catch {}
  if (!CURRENCY[lang]) lang = "en";
  const fmts = {};
  const formatter = (digits) => {
    const c = CURRENCY[lang];
    return (fmts[lang + digits] ||= new Intl.NumberFormat(c.locale, { style: "currency", currency: c.code, minimumFractionDigits: digits, maximumFractionDigits: digits }));
  };
  const money = (n) => formatter(2).format(n * CURRENCY[lang].rate);        // $45.00  /  ₺1.800,00
  const moneyShort = (n) => formatter(0).format(n * CURRENCY[lang].rate);   // $150    /  ₺6.000
  const mod = (n, m) => ((n % m) + m) % m;
  const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // Açılış: görseller hazır olunca halka dönerek yerine oturur (intro: -1 bekliyor, 0→1 oynuyor, 1 bitti)
  const INTRO_MS = 1900;
  const INTRO_SPIN = -3;
  const state = {
    rot: reduceMotion ? 0 : INTRO_SPIN, target: 0, vel: 0,
    dragging: false, mode: "ring",
    playing: !reduceMotion, elapsed: 0,
    intro: reduceMotion ? 1 : -1,
    px: 0, py: 0, tpx: 0, tpy: 0,          // fare derinlik efekti: anlık ve hedef konum (-1..1)
    geo: null, dirty: true, bag: 0
  };
  const liveEl = $("[data-live]");
  let announced = -1;

  /* ---------- Build DOM ---------- */
  const lookEls = LOOKS.map((look, i) => {
    const el = document.createElement("div");
    el.className = "look";
    el.dataset.index = i;
    el.innerHTML = `
      <div class="look-figure">
        <img src="${look.src}" alt="Look ${look.id}, ${look.name}" decoding="async" draggable="false">
        <div class="look-pins">
          ${look.items.map((it, k) => `<button class="pin" style="left:${it.pin[0]}%;top:${it.pin[1]}%" data-pin="${k}" aria-label="${it.name}" tabindex="-1">${k + 1}</button>`).join("")}
        </div>
      </div>`;
    const img = el.querySelector("img");
    const setAspect = () => { look.aspect = img.naturalWidth / img.naturalHeight; };
    img.complete ? setAspect() : img.addEventListener("load", setAspect, { once: true });
    ringEl.appendChild(el);
    return el;
  });

  // Alt gösterge: 5 noktalık, sonsuz dönen şerit. Noktalar halkayla birlikte kayar; uzaklaşanlar solar, yenileri yandan gelir.
  // Ortadaki (aktif) nokta uzun bir hap olur, otomatik geçişin ilerlemesini gösterir ve tıklayınca durdurur/oynatır.
  dotsEl.innerHTML = LOOKS.map((look, i) => `
    <button type="button" class="dot" data-dot="${i}" aria-label="Look ${look.id}, ${look.name}"><span class="dot-vis"><span class="dot-fill"></span></span></button>`).join("");
  const dotEls = [...dotsEl.children];
  const DOT_GAP = 16;        // noktalar arası mesafe
  const DOT_EXTRA = 12;      // aktif noktanın iki yanındaki ek boşluk

  /* ---------- Geometry ---------- */
  function measure() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const mobile = W < 640;
    const floorBase = mobile ? 10 : 8;           // öndeki look'un ayaklarının sahne altından uzaklığı
    // başlığın altında kalacak şekilde; öndeki look %20 büyüdüğü için tavana sığacak kadar küçük tutulur
    const copyBottom = $(".display").getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
    const figH = Math.min(mobile ? H * 0.66 : Math.min(H * 0.86, H - floorBase - copyBottom - 12), (H - floorBase - 10) / 1.32, 900);
    // öndeki look %10 aşağı iner, arkadakiler %10 yukarı çıkar (render içinde); alt payı ön look sahneden taşmasın diye eklenir
    const floorY = floorBase + figH * 0.10;
    const R = Math.min(figH * 1.15, W * (mobile ? 0.6 : 0.42));
    const D = R * 1.8;          // kamera uzaklığı
    const tilt = 0.12;          // zemin eğimi: arkadaki looklar ufka doğru yükselir
    state.geo = { W, H, mobile, figH, floorY, R, D, tilt };
    showroom.style.setProperty("--fig-h", figH + "px");
    showroom.style.setProperty("--floor-y", floorY + "px");
    showroom.style.setProperty("--bar-w", Math.max(176, Math.round(figH * 0.55)) + "px");   // gösterge, ortadaki look'un genişliğini geçmez
    state.dirty = true;
  }

  function frontIndex() { return mod(Math.round(state.rot), N); }

  function render() {
    const { R, D, tilt, mobile, H, figH } = state.geo;
    const front = frontIndex();
    const detail = state.mode === "detail";

    lookEls.forEach((el, i) => {
      const theta = wrapAngle((i - state.rot) * STEP);
      const deg = Math.abs(theta) * 180 / Math.PI;
      const depth = R * (1 - Math.cos(theta));
      let s = D / (D + depth);
      let x = R * Math.sin(theta) * s;
      let y = -depth * tilt;
      // near: 1 öndeki look, 0 uzaktakiler. Ön look %10 aşağı iner, arkadakiler %10 yukarı çıkar; ön look %20 büyür
      const near = Math.pow(Math.max(0, Math.cos(theta)), 6);
      y += figH * 0.10 * (2 * near - 1);
      s *= 1 + 0.2 * near;
      // Derinlik: kameraya yakın looklar farenin tersine daha çok, uzaktakiler daha az kayar
      x -= state.px * 18 * s * s;
      y -= state.py * 6 * s * s;

      // Merkezdeki look net; uzaklaştıkça bulanık, arka yarı tamamen görünmez
      let blur = deg < 5 ? 0 : (deg - 5) / 30 * 2.6;
      let opacity = deg <= 55 ? 1 - deg / 55 * 0.1 : Math.max(0, 0.9 * (1 - (deg - 55) / 33));

      if (detail) {
        if (i === front) {
          const panelW = panel.offsetWidth;
          if (mobile) {
            const sheet = panel.offsetHeight;
            const avail = showroom.clientHeight - sheet - 36;
            s = Math.min(1, avail / state.geo.figH);
            x = 0;
            y = -(sheet - (showroom.clientHeight - H) - state.geo.floorY + 12);
          } else {
            const barH = showroom.clientHeight - H;
            y = barH * 0.6;
            s = Math.min(1.3, (showroom.clientHeight - 40 - (barH - y + state.geo.floorY)) / state.geo.figH);
            x = panelW / 2;
          }
          blur = 0; opacity = 1;
        } else {
          opacity = 0;
        }
      }

      el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), ${y.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
      if (state.intro < 1) opacity *= state.intro < 0 ? 0 : Math.min(1, state.intro / 0.3);
      el.style.opacity = opacity.toFixed(3);
      el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
      el.style.zIndex = String(100 + Math.round(Math.cos(theta) * 100));
      el.classList.toggle("is-front", i === front);
    });

    dotEls.forEach((d, i) => {
      const off = wrapAngle((i - state.rot) * STEP) / STEP;           // aktif look'a uzaklık (look cinsinden)
      const a = Math.abs(off);
      const near = Math.max(0, 1 - a);                                 // 1: aktif nokta
      const x = Math.sign(off) * (a * DOT_GAP + Math.min(a, 1) * DOT_EXTRA);
      const op = a <= 1 ? 1 : a <= 2 ? 1 - (a - 1) * 0.55 : Math.max(0, 0.45 - (a - 2) * 0.9);   // en fazla 5 nokta görünür
      d.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px))`;
      d.style.width = `${(8 + near * 20).toFixed(1)}px`;
      d.style.opacity = op.toFixed(3);
      d.style.visibility = op < 0.01 ? "hidden" : "visible";
      d.classList.toggle("is-active", i === front);
      d.tabIndex = op < 0.3 ? -1 : 0;
      const label = i === front ? (state.playing ? "Pause autoplay" : "Play autoplay") : `Look ${LOOKS[i].id}, ${LOOKS[i].name}`;
      if (d.getAttribute("aria-label") !== label) d.setAttribute("aria-label", label);
      if (i === front) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });

    // ekran okuyucu: look değişince duyur
    if (state.intro >= 1 && front !== announced) {
      announced = front;
      liveEl.textContent = `Look ${LOOKS[front].id}, ${LOOKS[front].name}, ${front + 1} of ${N}`;
    }
  }

  /* ---------- Loop ---------- */
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(64, now - last); last = now;

    if (state.intro >= 0 && state.intro < 1) {
      state.intro = Math.min(1, state.intro + dt / INTRO_MS);
      const k = 1 - Math.pow(1 - state.intro, 4);       // easeOutQuart: hızlı başlar, yumuşak oturur
      state.rot = INTRO_SPIN * (1 - k);
      state.dirty = true;
      if (state.intro === 1) { state.rot = 0; state.elapsed = -1500; }
    } else if (state.intro >= 1 && !state.dragging) {
      const diff = state.target - state.rot;
      if (Math.abs(diff) > 0.0004) {
        state.rot += diff * (1 - Math.pow(0.0025, dt / 1000 * 1.6));
        state.dirty = true;
      } else if (state.rot !== state.target) {
        state.rot = state.target; state.dirty = true;
      }
    }

    // fare derinlik efekti: hedefe yumuşakça yaklaşır; panel açıkken ya da sürüklerken sıfıra döner
    const ptx = state.mode === "ring" && !state.dragging ? state.tpx : 0;
    const pty = state.mode === "ring" && !state.dragging ? state.tpy : 0;
    if (Math.abs(ptx - state.px) > 0.001 || Math.abs(pty - state.py) > 0.001) {
      const kp = 1 - Math.pow(0.02, dt / 1000);
      state.px += (ptx - state.px) * kp;
      state.py += (pty - state.py) * kp;
      state.dirty = true;
    }

    // fare sahnedeyken autoplay bekler, tıklanmak üzere olan look kaymaz
    if (state.playing && state.intro >= 1 && state.mode === "ring" && !state.dragging && !state.hover && !state.pdpOpen && !state.coOpen && !state.shopOpen && !state.infoOpen && !state.offscreen) {
      state.elapsed += dt;
      if (state.elapsed >= AUTOPLAY_MS) { go(1); }
    }
    const active = dotEls[frontIndex()];
    active.style.setProperty("--p", Math.max(0, Math.min(1, state.elapsed / AUTOPLAY_MS)).toFixed(4));

    if (state.dirty) { render(); state.dirty = false; }
    requestAnimationFrame(tick);
  }

  function go(delta) {
    if (state.intro < 1) return;
    state.target = Math.round(state.target) + delta;
    state.elapsed = 0;
  }
  function goTo(index) {
    if (state.intro < 1) return;
    let d = mod(index - frontIndex(), N);
    if (d > N / 2) d -= N;
    state.target = Math.round(state.rot) + d;
    state.elapsed = 0;
  }

  /* ---------- Drag ---------- */
  let start = null;
  stage.addEventListener("pointerdown", (e) => {
    if (state.mode !== "ring" || e.button !== 0 || state.intro < 1) return;
    if (e.pointerType === "touch" && e.clientX <= 28 && navMq.matches) return;      // sol kenar menüyü çekmek içindir
    start = { x: e.clientX, y: e.clientY, rot: state.rot, t: performance.now(), lastX: e.clientX, lastT: performance.now(), moved: false };
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && !reduceMotion) {
      const r = stage.getBoundingClientRect();
      state.tpx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      state.tpy = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    }
    updateCursor(e);
    if (!start || peek) return;                  // dikey sayfa geçişi sürerken look dönmez
    const dx = e.clientX - start.x;
    if (!start.moved && Math.abs(dx) > 6) {
      start.moved = true; state.dragging = true;
      stage.classList.add("is-dragging");
    }
    if (!start.moved) return;
    const pxPerItem = state.geo.R * 0.55;
    const now = performance.now();
    const newRot = start.rot - dx / pxPerItem;
    const dtv = Math.max(1, now - start.lastT);
    state.vel = 0.8 * ((newRot - state.rot) / dtv) + 0.2 * state.vel;
    start.lastT = now;
    state.rot = state.target = newRot;
    state.elapsed = 0;
    state.dirty = true;
  });

  const endDrag = (e) => {
    if (!start) return;
    const wasDrag = start.moved;
    start = null;
    stage.classList.remove("is-dragging");
    if (wasDrag) {
      state.dragging = false;
      const fling = Math.max(-3, Math.min(3, state.vel * 260));
      state.target = Math.round(state.rot + fling);
      state.vel = 0;
    } else if (e.type === "pointerup" && !peek) {      // dikey sayfa geçişi dokunma sayılmaz
      handleClick(e);
    }
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") state.hover = true; });
  stage.addEventListener("pointerleave", () => { state.hover = false; state.tpx = state.tpy = 0; });

  // Her look için küçük bir saydamlık haritası: fare, görünmez kutunun değil gerçekten figürün üstünde mi?
  const masks = new Map();
  function maskOf(i) {
    if (masks.has(i)) return masks.get(i);
    const img = lookEls[i].querySelector("img");
    if (!img.complete || !img.naturalWidth) return null;            // henüz yüklenmedi, sonra tekrar denenir
    let mask = false;                                                // false: harita çıkarılamadı, kutuya güven
    try {
      const w = 160, h = Math.round((w * img.naturalHeight) / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, w, h);
      mask = { w, h, data: g.getImageData(0, 0, w, h).data };
    } catch {}
    masks.set(i, mask);
    return mask;
  }
  function opaqueAt(el, x, y) {
    const m = maskOf(Number(el.dataset.index));
    if (!m) return true;
    const r = el.querySelector("img").getBoundingClientRect();      // ölçek ve kayma dahil gerçek konum
    const u = (x - r.left) / r.width, v = (y - r.top) / r.height;
    if (u < 0 || u > 1 || v < 0 || v > 1) return false;
    const px = Math.min(m.w - 1, Math.floor(u * m.w)), py = Math.min(m.h - 1, Math.floor(v * m.h));
    return m.data[(py * m.w + px) * 4 + 3] > 40;
  }
  function lookAt(x, y) {
    for (const n of document.elementsFromPoint(x, y)) {
      if (!n.classList || !n.classList.contains("look") || n.style.visibility === "hidden") continue;
      if (opaqueAt(n, x, y)) return n;                                // üstteki look'un boş yeri, arkadakini engellemez
    }
    return null;
  }

  function handleClick(e) {
    const el = lookAt(e.clientX, e.clientY);
    if (!el) return;
    const i = Number(el.dataset.index);
    if (i === frontIndex() && Math.abs(state.target - state.rot) < 0.2) openDetail();
    else goTo(i);
  }

  // Yandaki bir look'un üstündeyken fare işaretçisi "el" olur (tıklayınca öne gelir)
  function updateCursor(e) {
    if (e.pointerType !== "mouse" || state.mode !== "ring" || state.dragging) return;
    const el = lookAt(e.clientX, e.clientY);
    stage.style.cursor = el && Number(el.dataset.index) !== frontIndex() ? "pointer" : "";
  }

  let wheelSettle = null;
  stage.addEventListener("wheel", (e) => {
    if (state.mode !== "ring" || state.intro < 1) return;
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (horizontal) {
      // izleme dörtgeni / yatay kaydırma: halka parmağı sürekli izler, durunca en yakın look'a oturur
      e.preventDefault();
      state.rot = state.target = state.rot + e.deltaX / (state.geo.R * 0.55);
      state.elapsed = 0; state.dirty = true;
      clearTimeout(wheelSettle);
      wheelSettle = setTimeout(() => { state.target = Math.round(state.rot); }, 140);
      return;
    }
    // dikey tekerlek look'ları döndürmez; sayfa normal şekilde aşağı kayar
  }, { passive: false });

  /* ---------- Bar ---------- */
  $("[data-prev]").addEventListener("click", () => go(-1));
  $("[data-next]").addEventListener("click", () => go(1));
  // bir noktaya tıklayınca o look öne gelir; ortadaki (aktif) noktaya tıklayınca otomatik geçiş durur ya da devam eder
  dotsEl.addEventListener("click", (e) => {
    const d = e.target.closest("[data-dot]");
    if (!d) return;
    const i = Number(d.dataset.dot);
    if (i === frontIndex()) setPlaying(!state.playing); else goTo(i);
  });
  function setPlaying(on) {
    state.playing = on;
    dotsEl.classList.toggle("is-paused", !on);
    state.dirty = true;                          // aktif noktanın etiketi yenilensin
  }
  setPlaying(state.playing);

  /* ---------- Detail: In this look ---------- */
  function thumbStyle(look, crop) {
    const [y0, y1, cx] = crop;
    const h = y1 - y0;
    const a = (look.aspect || 0.52) / h;      // kutuya göre görsel genişliği
    const px = a > 1 ? (cx * a - 0.5) / (a - 1) : 0.5;
    const py = h < 1 ? y0 / (1 - h) : 0;
    const clamp = (v) => Math.max(0, Math.min(1, v));
    return `background-image:url('${look.src}');background-size:auto ${(100 / h).toFixed(2)}%;background-position:${(clamp(px) * 100).toFixed(2)}% ${(clamp(py) * 100).toFixed(2)}%`;
  }

  // Büyük görsellerde çok dar kırpma bulanıklaşır; en az minSpan kadar dikey alan göster
  function cropStyle(look, crop, minSpan = 0) {
    let [y0, y1, cx] = crop;
    if (y1 - y0 < minSpan) {
      const mid = (y0 + y1) / 2;
      y0 = Math.max(0, Math.min(1 - minSpan, mid - minSpan / 2));
      y1 = y0 + minSpan;
    }
    return thumbStyle(look, [y0, y1, cx]);
  }

  const SIZES = {
    apparel: ["XS", "S", "M", "L", "XL"],
    footwear: ["40", "40.5", "41", "42", "42.5", "43", "44", "45"],
    accessory: ["One size"]
  };
  const DEFAULT_SIZE = { apparel: "M", footwear: "42", accessory: "One size" };
  const sizesOf = (it) => it.sizes || SIZES[it.type] || SIZES.apparel;
  /* Stok (demo): ürün adı, renk ve bedene göre sabit ama rastgele görünen adetler.
     Her ürünün en az bir bedeni stokta kalır; 3 ve altı "az kaldı" sayılır. */
  const LOW_STOCK = 3;
  const hash32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rawStock = (it, size) => { const v = hash32(`${it.name}|${it.color}|${size}`) % 20; return v < 3 ? 0 : v < 7 ? v - 2 : 8 + v; };
  const stockOf = (it, size) => {
    const n = rawStock(it, size);
    if (n > 0 || sizesOf(it).some((s) => rawStock(it, s) > 0)) return n;
    return size === (DEFAULT_SIZE[it.type] || sizesOf(it)[0]) ? 8 : 0;      // hepsi tükenmişse varsayılan beden stokta tutulur
  };
  const defaultSize = (it) => {
    const pref = DEFAULT_SIZE[it.type] || sizesOf(it)[0];
    return stockOf(it, pref) > 0 ? pref : sizesOf(it).find((s) => stockOf(it, s) > 0) || pref;
  };
  const sizeNote = (size) => (size === "One size" ? "" : ` (${size})`);

  const COLOR_HEX = {
    "Red": "#c8102e", "Butter": "#f3e08a", "Violet Wash": "#8b6fc4", "Black": "#111111", "Off White": "#f2efe8",
    "Blush": "#f4c2cf", "Cream": "#f1e9d2", "Camo": "#5b6b3a", "Lemon": "#f2e58a", "White": "#ffffff",
    "Mocha": "#6b4a3c", "Washed Black": "#3a3a3d", "Wheat": "#d9a441", "Heather Grey": "#c9c9cc",
    "Oatmeal": "#d8d0c0", "Cobalt": "#2f5fb8", "Light Grey": "#c4c4c6", "Stone": "#bdb6a6",
    "Light Indigo": "#9fb6d3", "Pink": "#e86a92", "Woodland": "#66723f", "Forest": "#1e5a3a", "Navy": "#1f2d5a"
  };
  const swatchBg = (name) => {
    const hex = (n) => COLOR_HEX[n.trim()] || "#cacacb";
    const [a, b] = name.split("/");
    return b ? `linear-gradient(135deg, ${hex(a)} 50%, ${hex(b)} 50%)` : hex(a);
  };

  const pdpHref = (look, k) => `#/p/${look.id}-${k}`;

  const plusIcon = `<svg class="i-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><svg class="i-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;

  function fillPanel(look) {
    const total = look.items.reduce((s, it) => s + it.price, 0);
    $("[data-panel-look]").textContent = `Look ${look.id}, ${look.name}`;
    const lookFav = $("[data-panel-fav]");
    lookFav.dataset.fav = `l:${look.id}`;
    lookFav.setAttribute("aria-pressed", isFav(lookFav.dataset.fav));
    $("[data-panel-count]").textContent = `${look.items.length} pieces`;
    $("[data-bundle-note]").textContent = `Bundle all ${look.items.length} and save ${BUNDLE_OFF * 100}%`;
    $("[data-bundle-was]").textContent = money(total);
    $("[data-bundle-now]").textContent = money(total * (1 - BUNDLE_OFF));
    piecesEl.innerHTML = look.items.map((it, k) => `
      <li class="piece" data-piece="${k}" style="transition-delay:${0.18 + k * 0.06}s">
        <a class="piece-thumb" href="${pdpHref(look, k)}" style="${thumbStyle(look, it.crop)}" aria-label="View ${it.name}"><span>${k + 1}</span></a>
        <div>
          <p class="piece-brand">${it.brand}</p>
          <p class="piece-name"><a href="${pdpHref(look, k)}">${it.name}</a></p>
          <p class="piece-meta">${it.color}</p>
          <p class="piece-price">${money(it.price)}</p>
        </div>
        <div class="piece-actions">
          ${favBtn(pieceFavId(look, k), `Save ${it.name} to favorites`, "fav-sm")}
          <button class="piece-add${qtyOf(look.id, k) ? " is-added" : ""}" data-add="${k}" aria-label="${qtyOf(look.id, k) ? `${it.name} is in your bag, open bag` : `Add ${it.name} to bag`}">${plusIcon}</button>
        </div>
      </li>`).join("");
  }

  /* Mobil look paneli: üst kısmından (look adı, favori, paylaş, geri) yukarı çekince ekranın tamamını kaplar, aşağı çekince küçülür */
  const sheetMq = matchMedia("(max-width: 640px)");
  const headEl = $(".site-head");
  let sheetFull = false, sheetHeadH = 96, sheet = null, sheetDragAt = 0;
  function setSheet(full) {
    if (full && !sheetMq.matches) full = false;
    panel.style.height = "";
    panel.classList.remove("is-sheet-drag");
    if (full !== sheetFull) {
      if (!sheetFull) sheetHeadH = headEl.offsetHeight;
      sheetFull = full;
      document.documentElement.classList.toggle("sheet-full", full);
    }
    panel.classList.toggle("is-full", full);
  }
  const sheetBounds = () => {
    const head = sheetFull ? sheetHeadH : headEl.offsetHeight;
    return { min: Math.round((innerHeight - head) * 0.58), max: innerHeight };
  };
  panel.addEventListener("pointerdown", (e) => {
    if (!sheetMq.matches || state.mode !== "detail" || e.button !== 0) return;
    if (e.clientY > $(".panel-head", panel).getBoundingClientRect().bottom) return;       // yalnızca üst bölge tutamaç
    sheet = { id: e.pointerId, y: e.clientY, h: panel.getBoundingClientRect().height, t: performance.now(), moved: false };
  });
  panel.addEventListener("pointermove", (e) => {
    if (!sheet || e.pointerId !== sheet.id) return;
    const dy = e.clientY - sheet.y;
    if (!sheet.moved) {
      if (Math.abs(dy) < 6) return;
      sheet.moved = true;
      panel.setPointerCapture(e.pointerId);
      panel.classList.add("is-sheet-drag");
    }
    const { min, max } = sheetBounds();
    panel.style.height = `${Math.max(min, Math.min(max, sheet.h - dy))}px`;
  });
  const sheetEnd = (e) => {
    if (!sheet || e.pointerId !== sheet.id) return;
    const s = sheet; sheet = null;
    if (!s.moved) {
      if (e.type === "pointerup" && e.target.closest("[data-grip]")) setSheet(!sheetFull);   // tutamağa dokunmak da açıp kapatır
      return;
    }
    sheetDragAt = performance.now();
    const dy = e.clientY - s.y, speed = dy / Math.max(1, performance.now() - s.t);
    const { min, max } = sheetBounds();
    const h = Math.max(min, Math.min(max, s.h - dy));
    const mid = min + (max - min) * 0.35;
    // hızlı çekiş yönü belirler; yavaşsa geldiği yere göre karar verilir
    setSheet(Math.abs(speed) > 0.5 ? speed < 0 : h > mid);
  };
  panel.addEventListener("pointerup", sheetEnd);
  panel.addEventListener("pointercancel", sheetEnd);
  panel.addEventListener("click", (e) => { if (performance.now() - sheetDragAt < 350) { e.stopPropagation(); e.preventDefault(); } }, true);   // sürüklemeden sonra düğmeler tetiklenmesin
  sheetMq.addEventListener("change", () => setSheet(false));

  let lastFocus = null;
  // Kullanıcı eylemleri yalnızca adresi değiştirir (#/look/05); açma ve kapamayı route() yapar.
  // Böylece geri tuşu ve paylaşılan bağlantılar da aynı yoldan çalışır.
  function openDetail() {
    if (state.intro < 1) return;
    location.hash = `#/look/${LOOKS[frontIndex()].id}`;
  }
  function closeDetail() {
    if (state.mode !== "detail") return;
    location.hash = "";
  }
  function showDetail() {
    const front = frontIndex();
    fillPanel(LOOKS[front]);
    state.mode = "detail";
    showroom.dataset.mode = "detail";
    panel.setAttribute("aria-hidden", "false");
    stage.style.cursor = "";
    lookEls.forEach((el, i) => el.querySelectorAll(".pin").forEach((p) => (p.tabIndex = i === front ? 0 : -1)));
    tween();
    lastFocus = document.activeElement;
    setTimeout(() => $("[data-close]").focus({ preventScroll: true }), 50);
  }
  function hideDetail() {
    if (state.mode !== "detail") return;
    state.mode = "ring";
    showroom.dataset.mode = "ring";
    panel.setAttribute("aria-hidden", "true");
    setSheet(false);
    state.elapsed = 0;
    document.title = BASE_TITLE;
    setHighlight(-1);
    tween();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  // Adres #/look/05 ise o look öne gelir ve paneli açılır (paylaşılan bağlantı dahil)
  function showLook(idx) {
    const look = LOOKS[idx];
    document.title = `Look ${look.id}, ${look.name} — ALTÉ`;
    if (!navMq.matches) { lockY = 0; window.scrollTo({ top: 0, behavior: "instant" }); }   // look paneli showroom'da açılır, oraya in
    else setMobileView("showroom");
    if (state.mode === "detail" && frontIndex() === idx) return;
    if (state.intro < 1) {                       // doğrudan bağlantıyla gelindi: açılış hareketini atla
      state.intro = 1; state.elapsed = -1500;
      showroom.classList.add("is-ready");
    }
    let d = mod(idx - frontIndex(), N);
    if (d > N / 2) d -= N;
    state.rot = state.target = Math.round(state.rot) + d;
    state.dirty = true;
    showDetail();
  }
  // Mod değişiminde looklara geçici CSS transition ver
  let tweenTimer;
  function tween() {
    lookEls.forEach((el) => (el.style.transition = "transform .75s cubic-bezier(.22,.8,.24,1), opacity .5s ease, filter .5s ease"));
    state.dirty = true;
    clearTimeout(tweenTimer);
    tweenTimer = setTimeout(() => lookEls.forEach((el) => (el.style.transition = "")), 800);
  }

  function setHighlight(k) {
    const front = lookEls[frontIndex()];
    front.querySelectorAll(".pin").forEach((p) => p.classList.toggle("is-on", Number(p.dataset.pin) === k));
    piecesEl.querySelectorAll(".piece").forEach((p) => p.classList.toggle("is-on", Number(p.dataset.piece) === k));
  }

  $("[data-close]").addEventListener("click", closeDetail);
  // Paylaş: telefonda sistem paylaşım menüsü, bilgisayarda bağlantıyı panoya kopyalar
  $("[data-share]").addEventListener("click", async () => {
    const look = LOOKS[frontIndex()];
    const data = { title: `Look ${look.id}, ${look.name} — ALTÉ`, url: location.href };
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share(data); return; }
      try {
        await navigator.clipboard.writeText(data.url);
      } catch {
        // pano izni verilmemişse eski yöntemle kopyala
        const ta = document.createElement("textarea");
        ta.value = data.url; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        if (!ok) throw new Error("copy failed");
      }
      toast("Link copied");
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast("Copy the link from the address bar");
    }
  });
  ringEl.addEventListener("click", (e) => {
    const pin = e.target.closest(".pin");
    if (!pin || state.mode !== "detail") return;
    const k = Number(pin.dataset.pin);
    setHighlight(k);
    piecesEl.children[k]?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  });
  ringEl.addEventListener("pointerover", (e) => {
    const pin = e.target.closest(".pin");
    if (pin && state.mode === "detail") setHighlight(Number(pin.dataset.pin));
  });
  piecesEl.addEventListener("pointerover", (e) => {
    const p = e.target.closest(".piece");
    if (p) setHighlight(Number(p.dataset.piece));
  });

  /* ---------- Bag ---------- */
  const bagEl = $("[data-bag]");
  const scrim = $("[data-scrim]");
  const bagList = $("[data-bag-list]");
  const bagBtn = $(".bag-btn");
  const CART_KEY = "lobby-bag";
  let cart = {};                       // { "01:2:M": adet }  (look:parça:beden)
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { cart = {}; }
  // Eski kayıtlı sepetlerdeki "US 9" gibi ayakkabı bedenleri EU numarasına çevrilir
  const US_TO_EU = { "US 7": "40", "US 8": "41", "US 9": "42", "US 10": "43", "US 11": "44", "US 12": "45" };
  cart = Object.entries(cart).reduce((acc, [key, q]) => {
    const i = key.lastIndexOf(":"), eu = US_TO_EU[key.slice(i + 1)];
    const k = eu ? `${key.slice(0, i)}:${eu}` : key;
    acc[k] = (acc[k] || 0) + q;
    return acc;
  }, {});

  const cartKey = (id, k, size) => `${id}:${k}:${size}`;
  // Bir parçanın tüm bedenlerdeki toplam adedi
  const qtyOf = (id, k) => Object.entries(cart).reduce((s, [key, q]) => {
    const p = key.split(":");
    return p[0] === id && p[1] === String(k) ? s + q : s;
  }, 0);

  const cartLines = () => Object.entries(cart).map(([key, qty]) => {
    const [id, k, size] = key.split(":");
    const look = LOOKS.find((l) => l.id === id);
    const item = look && look.items[Number(k)];
    return item ? { key, look, k: Number(k), item, qty, size: size || defaultSize(item) } : null;
  }).filter(Boolean);

  // Bir look'un tüm parçaları sepetteyse her set için %10 indirim
  function bundleSavings() {
    return LOOKS.reduce((sum, look) => {
      const sets = Math.min(...look.items.map((_, k) => qtyOf(look.id, k)));
      return sum + sets * look.items.reduce((s, it) => s + it.price, 0) * BUNDLE_OFF;
    }, 0);
  }

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
  }

  function updateBagCount(bump) {
    const n = cartLines().reduce((s, l) => s + l.qty, 0);
    bagCount.textContent = n;
    bagCount.classList.toggle("has-items", n > 0);
    bagBtn.setAttribute("aria-label", n ? `Bag, ${n} items` : "Bag");
    if (bump) { bagCount.classList.remove("bump"); void bagCount.offsetWidth; bagCount.classList.add("bump"); }
  }

  function syncPieceButtons() {
    if (state.mode !== "detail") return;
    const look = LOOKS[frontIndex()];
    piecesEl.querySelectorAll("[data-add]").forEach((btn) => {
      const k = Number(btn.dataset.add);
      const inBag = qtyOf(look.id, k) > 0;
      btn.classList.toggle("is-added", inBag);
      btn.setAttribute("aria-label", inBag ? `${look.items[k].name} is in your bag, open bag` : `Add ${look.items[k].name} to bag`);
    });
  }

  const minusIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>`;
  const smallPlus = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

  function renderBag() {
    const lines = cartLines();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    bagEl.classList.toggle("is-empty", lines.length === 0);
    $("[data-bag-total-count]").textContent = count ? `(${count})` : "";
    bagList.innerHTML = lines.map(({ key, look, k, item, qty, size }) => `
      <li class="bag-item">
        <div class="piece-thumb" style="${thumbStyle(look, item.crop)}"></div>
        <div>
          <div class="bag-item-top">
            <div>
              <p class="piece-brand">${item.brand}</p>
              <p class="piece-name">${item.name}</p>
              <p class="piece-meta">${item.color}</p>
              ${sizesOf(item).length > 1
                ? `<label class="bag-size">Size <select data-size="${key}" aria-label="Size for ${item.name}">${sizesOf(item).map((s) => `<option${s === size ? " selected" : ""}${stockOf(item, s) || s === size ? "" : " disabled"}>${s}</option>`).join("")}</select></label>`
                : `<p class="piece-meta">${size}</p>`}
            </div>
            <p class="bag-item-price">${money(item.price * qty)}</p>
          </div>
          <div class="bag-item-bottom">
            <div class="stepper" role="group" aria-label="Quantity for ${item.name}">
              <button data-dec="${key}" aria-label="Decrease quantity">${minusIcon}</button>
              <output>${qty}</output>
              <button data-inc="${key}" aria-label="Increase quantity">${smallPlus}</button>
            </div>
            <button class="bag-remove" data-remove="${key}">Remove</button>
          </div>
        </div>
      </li>`).join("");
    const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
    const saving = bundleSavings();
    $("[data-bag-subtotal]").textContent = money(subtotal);
    $("[data-bag-saving]").textContent = "-" + money(saving);
    $("[data-bag-saving-row]").hidden = saving <= 0;
    $("[data-bag-total]").textContent = money(subtotal - saving);
  }

  // Sepete stoktan fazla eklenmez; eklenemediyse false döner
  function changeBag(key, delta, bump) {
    const next = (cart[key] || 0) + delta;
    if (delta > 0) {
      const [id, k, size] = key.split(":");
      const look = LOOKS.find((l) => l.id === id), item = look && look.items[Number(k)];
      const have = item && size ? stockOf(item, size) : Infinity;
      if (next > have) { toast(have ? `Only ${have} left in this size` : "This size is sold out"); return false; }
    }
    if (next <= 0) delete cart[key]; else cart[key] = next;
    saveCart(); updateBagCount(bump); syncPieceButtons();
    if (bagEl.classList.contains("is-open")) renderBag();
    if (state.coOpen) refreshCheckout();
    return true;
  }

  let bagFocus = null;
  function openBag() {
    renderBag();
    bagFocus = document.activeElement;
    bagEl.classList.add("is-open"); scrim.classList.add("is-open");
    bagEl.removeAttribute("inert"); bagEl.setAttribute("aria-hidden", "false");
    state.bagOpen = true;
    updateLock();
    setTimeout(() => $("[data-bag-close]").focus({ preventScroll: true }), 50);
  }
  function closeBag() {
    bagEl.classList.remove("is-open"); scrim.classList.remove("is-open");
    bagEl.setAttribute("inert", ""); bagEl.setAttribute("aria-hidden", "true");
    state.bagOpen = false;
    updateLock();
    (bagFocus || bagBtn).focus({ preventScroll: true });
  }

  bagBtn.addEventListener("click", openBag);
  $("[data-bag-close]").addEventListener("click", closeBag);
  scrim.addEventListener("click", () => {
    if (state.menuOpen) { closeMenu(); menuBtn.focus({ preventScroll: true }); }
    else if (state.bagOpen) closeBag();
  });
  bagList.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const rem = e.target.closest("[data-remove]");
    if (inc) changeBag(inc.dataset.inc, 1);
    else if (dec) changeBag(dec.dataset.dec, -1);
    else if (rem) { changeBag(rem.dataset.remove, -(cart[rem.dataset.remove] || 0)); toast("Removed from bag"); }
  });
  // Sepet satırında beden değişince satırı yeni bedene taşı (aynı bedenli satır varsa birleştir)
  bagList.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-size]");
    if (!sel) return;
    const oldKey = sel.dataset.size;
    const [id, k] = oldKey.split(":");
    const newKey = cartKey(id, k, sel.value);
    if (newKey === oldKey) return;
    cart[newKey] = (cart[newKey] || 0) + cart[oldKey];
    delete cart[oldKey];
    saveCart(); renderBag();
    if (state.coOpen) refreshCheckout();
  });
  $("[data-checkout]").addEventListener("click", () => { closeBag(); location.hash = "#/checkout"; });

  // Panelden hızlı ekleme varsayılan bedenle yapılır; beden seçmek için parça sayfası açılır
  piecesEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    if (btn.classList.contains("is-added")) { openBag(); return; }
    const look = LOOKS[frontIndex()];
    const k = Number(btn.dataset.add);
    const item = look.items[k];
    const size = defaultSize(item);
    if (!changeBag(cartKey(look.id, k, size), 1, true)) return;
    toast(`Added ${item.name}${sizeNote(size)} to bag`);
  });
  $("[data-add-all]").addEventListener("click", () => {
    const look = LOOKS[frontIndex()];
    const missing = look.items.map((it, k) => ({ it, k })).filter(({ k }) => !qtyOf(look.id, k));
    if (!missing.length) { toast("This look is already in your bag"); return; }
    if (!missing.every(({ it, k }) => changeBag(cartKey(look.id, k, defaultSize(it)), 1, true))) return;
    toast(`Added look ${look.id} to bag, ${BUNDLE_OFF * 100}% off applied`);
  });
  updateBagCount(false);

  /* ---------- Product page ---------- */
  const pdpEl = $("[data-pdp]");
  const BASE_TITLE = document.title;
  const PDP_RE = /^#\/p\/(\d+)-(\d+)$/;
  let pdpCtx = null;                   // { look, k, size }
  let pdpFocus = null;

  const PDP_COPY = {
    apparel: "Heavyweight, garment-washed fabric cut loose through the body. Made to be layered and worn in.",
    footwear: "A cushioned sole and a clean, low profile. Everyday comfort that keeps its shape.",
    accessory: "The finishing piece. Worn in, easy to style, made to sit with the rest of the look."
  };
  const PDP_FACTS = {
    apparel: ["Relaxed, oversized fit", "Garment-washed cotton blend", "Machine wash cold"],
    footwear: ["True to size", "Leather and textile upper", "Rubber outsole"],
    accessory: ["Adjustable fit", "Cotton blend", "Spot clean"]
  };
  const lookViewStyle = (look) => `background-image:url('${look.src}');background-size:contain;background-position:center bottom`;
  const arrowLeft = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>`;

  function renderPdp(look, k) {
    const it = look.items[k];
    const sizes = sizesOf(it);
    const one = sizes.length === 1;
    const type = it.type || "apparel";
    pdpCtx = { look, k, size: one ? sizes[0] : null };
    const others = look.items.map((o, i) => ({ o, i })).filter(({ i }) => i !== k);

    pdpEl.innerHTML = `
      <div class="pdp-inner">
        ${cameFromShop === "catalog"
          ? `<a class="pdp-back" href="#">${arrowLeft} Back to shopping</a>`
          : cameFromShop
          ? `<a class="pdp-back" href="${shopHash(cameFromShop)}">${arrowLeft} Back to ${SHOPS[cameFromShop].title}</a>`
          : `<a class="pdp-back" href="#/look/${look.id}">${arrowLeft} Back to Look ${look.id}, ${look.name}</a>`}
        <div class="pdp-grid">
          <div class="pdp-gallery">
            <ul class="pdp-thumbs">
              <li><button class="pdp-thumb is-on" data-view="piece" aria-pressed="true" aria-label="Product view" style="${cropStyle(look, it.crop, 0.28)}"></button></li>
              <li><button class="pdp-thumb" data-view="look" aria-pressed="false" aria-label="Full look view" style="${lookViewStyle(look)}"></button></li>
            </ul>
            <div class="pdp-main" data-pdp-main role="img" aria-label="${it.name}, ${it.color}" style="${cropStyle(look, it.crop, 0.28)}"></div>
          </div>
          <div class="pdp-info">
            <p class="pdp-brand">${it.brand}</p>
            <h1 class="pdp-name" tabindex="-1">${it.name}</h1>
            <p class="pdp-look">From Look ${look.id}, ${look.name}</p>
            <p class="pdp-price">${money(it.price)}</p>

            <div class="pdp-field">
              <p class="pdp-label">Color <span>${it.color}</span></p>
              <ul class="swatches"><li><span class="swatch is-on" style="background:${swatchBg(it.color)}" role="img" aria-label="${it.color}"></span></li></ul>
            </div>

            <div class="pdp-field">
              <div class="pdp-label-row">
                <p class="pdp-label" id="pdp-size-label">${one ? "Size" : "Select size"}</p>
                ${one ? "" : `<button type="button" class="size-guide-btn" data-size-guide>Size guide</button>`}
              </div>
              <div class="size-grid" data-size-grid role="group" aria-labelledby="pdp-size-label">
                ${sizes.map((s) => {
                  const out = stockOf(it, s) === 0;
                  return `<button class="size-chip${one ? " is-on" : ""}${out ? " is-out" : ""}" data-size-opt="${s}" aria-pressed="${one}"${out ? ` disabled aria-label="${s}, sold out"` : ""}>${s}</button>`;
                }).join("")}
              </div>
              <p class="pdp-stock" data-pdp-stock aria-live="polite">${stockLine(it, one ? sizes[0] : null)}</p>
              <p class="pdp-error" data-pdp-error role="alert" hidden>Select a size to add this piece to your bag.</p>
            </div>

            <div class="pdp-actions">
              <button class="button-primary" data-pdp-add>Add to bag</button>
              ${favBtn(pieceFavId(look, k), `Save ${it.name} to favorites`, "pdp-fav")}
            </div>
            <p class="pdp-ship">Free shipping on orders over ${moneyShort(FREE_SHIP)}. Free returns within 30 days.</p>

            <p class="pdp-desc">${it.desc || PDP_COPY[type]}</p>
            <details class="pdp-row">
              <summary>Product details</summary>
              <ul>${[...(it.facts || PDP_FACTS[type]), `Color shown: ${it.color}`, `Style: ALTE-${look.id}-${k + 1}`].map((f) => `<li>${f}</li>`).join("")}</ul>
            </details>
            <details class="pdp-row">
              <summary>Shipping and returns</summary>
              <p>Free standard shipping on orders over ${moneyShort(FREE_SHIP)}. Return unworn pieces within 30 days for a full refund.</p>
            </details>
          </div>
        </div>

        <section class="pdp-more" aria-labelledby="pdp-more-h">
          <h2 id="pdp-more-h">Complete the look</h2>
          <ul class="pdp-cards">
            ${others.map(({ o, i }) => `
              <li>
                <a class="pdp-card" href="${pdpHref(look, i)}">
                  <span class="pdp-card-img" style="${cropStyle(look, o.crop, 0.2)}"></span>
                  <span class="pdp-card-name">${o.name}</span>
                  <span class="pdp-card-meta">${o.color}</span>
                  <span class="pdp-card-price">${money(o.price)}</span>
                </a>
              </li>`).join("")}
          </ul>
        </section>
        ${recentHTML(PRODUCT_OF.get(`${look.id}:${k}`))}
      </div>`;
  }

  // Seçili bedenin stok durumu: "Only 2 left in size M", "In stock" ya da (beden seçilmediyse) boş
  function stockLine(it, size) {
    if (!size) return "";
    const n = stockOf(it, size);
    if (n === 0) return "Sold out";
    if (n > LOW_STOCK) return "In stock";
    return size === "One size" ? `Only ${n} left` : `Only ${n} left in size ${size}`;
  }

  /* Son baktıkların: parça sayfasını açtıkça kaydedilir (en yeni başta, en fazla 12), katalog altında ve parça sayfasında gösterilir */
  const RECENT_KEY = "lobby-recent";
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { recent = []; }
  const saveRecent = () => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch {} };
  const productById = (id) => { const m = /^(\d+)-(\d+)$/.exec(id); return m ? PRODUCT_OF.get(`${m[1]}:${m[2]}`) : null; };
  function pushRecent(look, k) {
    const p = PRODUCT_OF.get(`${look.id}:${k}`);
    if (!p) return;
    const id = `${p.look.id}-${p.k}`;
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, 12);
    saveRecent();
  }
  function recentHTML(except) {
    const list = recent.map(productById).filter((p) => p && p !== except);
    if (!list.length) return "";
    return `
      <section class="recent" aria-label="Recently viewed">
        <div class="recent-head">
          <h2>Recently viewed</h2>
          <button type="button" class="recent-clear" data-recent-clear>Clear</button>
        </div>
        <ul class="recent-list">
          ${list.map(({ look, k, it }) => `
            <li>
              <a class="recent-card" href="${pdpHref(look, k)}">
                <span class="recent-img" style="${cropStyle(look, it.crop, 0.2)}"></span>
                <span class="recent-name">${it.name}</span>
                <span class="recent-price">${money(it.price)}</span>
              </a>
            </li>`).join("")}
        </ul>
      </section>`;
  }
  const recentBox = $("[data-recent]");
  function renderRecent() {
    const html = recentHTML(null);
    recentBox.innerHTML = html;
    recentBox.hidden = !html;
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-recent-clear]")) return;
    recent = []; saveRecent();
    renderRecent();
    const strip = $(".recent", pdpEl);
    if (strip) strip.remove();
  });

  /* Beden rehberi (demo ölçüler): giyimde göğüs ya da bel, ayakkabıda ayak uzunluğu */
  const GUIDE = {
    tops: { head: ["Size", "Chest (cm)", "Length (cm)", "Height (cm)"], rows: [["XS", "100", "68", "160–168"], ["S", "104", "70", "168–174"], ["M", "108", "72", "174–180"], ["L", "112", "74", "180–186"], ["XL", "116", "76", "186–192"]] },
    bottoms: { head: ["Size", "Waist (cm)", "Inseam (cm)", "Height (cm)"], rows: [["XS", "68–72", "76", "160–168"], ["S", "72–76", "78", "168–174"], ["M", "76–82", "80", "174–180"], ["L", "82–88", "82", "180–186"], ["XL", "88–94", "84", "186–192"]] },
    footwear: { head: ["EU", "US", "Foot length (cm)"], rows: [["40", "7", "25.0"], ["40.5", "7.5", "25.3"], ["41", "8", "25.7"], ["42", "9", "26.3"], ["42.5", "9.5", "26.7"], ["43", "10", "27.0"], ["44", "11", "27.7"], ["45", "12", "28.3"]] }
  };
  const guideEl = document.createElement("dialog");
  guideEl.className = "guide";
  guideEl.setAttribute("aria-labelledby", "guide-title");
  document.body.appendChild(guideEl);
  function openSizeGuide(it) {
    const key = it.type === "footwear" ? "footwear" : /pant|jean|jort|cargo/i.test(it.name) ? "bottoms" : "tops";
    const g = GUIDE[key];
    guideEl.innerHTML = `
      <div class="guide-box">
        <div class="guide-head">
          <h2 id="guide-title">Size guide</h2>
          <button type="button" class="icon-btn" data-guide-close aria-label="Close size guide">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <p class="guide-lead">${key === "footwear"
          ? "Measure your foot from heel to longest toe and match it to the foot length. Between sizes? Take the larger one."
          : "Body measurements. Our fits are relaxed and oversized; between sizes, size down for a closer fit."}</p>
        <div class="guide-scroll">
          <table class="guide-table">
            <thead><tr>${g.head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead>
            <tbody>${g.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
      </div>`;
    guideEl.showModal();
  }
  guideEl.addEventListener("click", (e) => { if (e.target === guideEl || e.target.closest("[data-guide-close]")) guideEl.close(); });

  function openPdp(look, k) {
    if (!state.pdpOpen) pdpFocus = document.activeElement;
    pushRecent(look, k);
    renderPdp(look, k);
    renderRecent();
    state.pdpOpen = true;
    pdpEl.classList.add("is-open");
    pdpEl.removeAttribute("inert"); pdpEl.setAttribute("aria-hidden", "false");
    pageEl.setAttribute("inert", "");
    pdpEl.scrollTop = 0;
    document.title = `${look.items[k].name} — ALTÉ`;
    $(".pdp-name", pdpEl).focus({ preventScroll: true });
  }

  function closePdp() {
    if (!state.pdpOpen) return;
    state.pdpOpen = false;
    pdpEl.classList.remove("is-open");
    pdpEl.setAttribute("inert", ""); pdpEl.setAttribute("aria-hidden", "true");
    pageEl.removeAttribute("inert");
    document.title = BASE_TITLE;
    if (pdpFocus && document.contains(pdpFocus)) pdpFocus.focus({ preventScroll: true });
  }

  // Adres çubuğu: #/p/01-2  ->  look 01, 3. parça. Geri tuşu ve paylaşılan bağlantı çalışır.
  function route() {
    routeInner();
    // üstte sayfa açılınca tam ekran look paneli küçülür; yoksa gizlenen üst çubuk yüzünden panel sayfanın üstünde kalır ve geri tuşu çalışmaz
    if (state.pdpOpen || state.shopOpen || state.coOpen || state.infoOpen) setSheet(false);
    updateLock();
  }
  function routeInner() {
    const hash = location.hash;
    closeMenu();
    const infoKey = INFO_ROUTES[hash];
    if (!infoKey) closeInfo();
    if (hash === "#/checkout") {
      closePdp(); closeShop(); cameFromShop = null;
      openCheckout(); setNav("looks");
      return;
    }
    closeCheckout();
    closeSuggest();
    if (infoKey) { closePdp(); closeShop(); cameFromShop = null; openInfo(infoKey); setNav("looks"); return; }
    const found = /^#\/search\/(.*)$/.exec(hash);
    if (found) {
      let q = found[1];
      try { q = decodeURIComponent(q); } catch {}
      if (q.trim()) { closePdp(); openSearch(q.trim()); setNav("search"); return; }
    }
    if (hash === "#/favorites") { closePdp(); openShop("favorites"); setNav("favorites"); return; }
    const shop = /^#\/shop\/(\w+)$/.exec(hash);
    if (shop && !["search", "favorites"].includes(shop[1]) && SHOPS[shop[1]]) {
      closePdp(); openShop(shop[1]); setNav(shop[1]);
      return;
    }
    closeShop();
    const m = PDP_RE.exec(hash);
    const look = m && LOOKS.find((l) => l.id === m[1]);
    const item = look && look.items[Number(m[2])];
    if (item) { openPdp(look, Number(m[2])); return; }
    closePdp(); cameFromShop = null; setNav("looks"); syncNavSpy(); syncMobileNav();
    const lm = /^#\/look\/(\d+)$/.exec(hash);
    const idx = lm ? LOOKS.findIndex((l) => l.id === lm[1]) : -1;
    if (idx >= 0) showLook(idx); else hideDetail();
  }
  addEventListener("hashchange", route);

  pdpEl.addEventListener("click", (e) => {
    const view = e.target.closest("[data-view]");
    const opt = e.target.closest("[data-size-opt]");
    if (view) {
      const { look, k } = pdpCtx;
      $("[data-pdp-main]", pdpEl).style.cssText = view.dataset.view === "look" ? lookViewStyle(look) : cropStyle(look, look.items[k].crop, 0.28);
      pdpEl.querySelectorAll("[data-view]").forEach((b) => {
        const on = b === view;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on);
      });
    } else if (opt) {
      pdpCtx.size = opt.dataset.sizeOpt;
      pdpEl.querySelectorAll("[data-size-opt]").forEach((b) => {
        const on = b === opt;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on);
      });
      $("[data-pdp-error]", pdpEl).hidden = true;
      const stock = $("[data-pdp-stock]", pdpEl), line = stockLine(pdpCtx.look.items[pdpCtx.k], pdpCtx.size);
      stock.textContent = line;
      stock.classList.toggle("is-low", line.startsWith("Only"));
    } else if (e.target.closest("[data-size-guide]")) {
      openSizeGuide(pdpCtx.look.items[pdpCtx.k]);
    } else if (e.target.closest("[data-pdp-add]")) {
      const { look, k, size } = pdpCtx;
      if (!size) {
        const grid = $("[data-size-grid]", pdpEl);
        $("[data-pdp-error]", pdpEl).hidden = false;
        grid.classList.remove("is-error"); void grid.offsetWidth; grid.classList.add("is-error");
        grid.querySelector("button").focus({ preventScroll: true });
        return;
      }
      if (!changeBag(cartKey(look.id, k, size), 1, true)) return;
      toast(`Added ${look.items[k].name}${sizeNote(size)} to bag`);
    }
  });

  /* ---------- Shop (listing pages) ---------- */
  const shopEl = $("[data-shop]");
  const TYPE_LABEL = { apparel: "Clothing", footwear: "Footwear", accessory: "Accessories" };
  const NEW_FROM = 10;                         // look 10 ve sonrasındaki parçalar "Just In"
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "40", "40.5", "41", "42", "42.5", "43", "44", "45", "One size"];
  const PRICE_BANDS = [
    { id: "u50", label: () => `Under ${moneyShort(50)}`, test: (p) => p < 50 },
    { id: "50", label: () => `${moneyShort(50)} to ${moneyShort(100)}`, test: (p) => p >= 50 && p < 100 },
    { id: "100", label: () => `${moneyShort(100)} to ${moneyShort(150)}`, test: (p) => p >= 100 && p < 150 },
    { id: "150", label: () => `${moneyShort(150)} and up`, test: (p) => p >= 150 }
  ];

  // Aynı parça birden fazla look'ta geçiyorsa (aynı ad ve renk) listede bir kez gösterilir
  const PRODUCT_OF = new Map();                // "08:1" -> ürün (tekrar eden parçalar ilk geçtiği ürüne bağlanır)
  const PRODUCTS = (() => {
    const seen = new Map(), list = [];
    LOOKS.forEach((look) => look.items.forEach((it, k) => {
      const key = `${it.name}|${it.color}`;
      if (!seen.has(key)) {
        const p = { look, k, it, sizes: sizesOf(it), isNew: Number(look.id) >= NEW_FROM };
        seen.set(key, p);
        list.push(p);
      }
      PRODUCT_OF.set(`${look.id}:${k}`, seen.get(key));
    }));
    return list;
  })();

  const isBottom = (p) => /pant|jean|jort|cargo/i.test(p.it.name);
  const SHOPS = {
    new: { title: "NEW DROP", test: (p) => p.isNew, facets: ["type", "color", "size", "price"] },
    clothing: { title: "Clothing", test: (p) => p.it.type === "apparel", facets: ["color", "size", "price"] },
    // giyim üst ve alt olarak ayrılır: pantolon, şort, kot, kargo = alt; geri kalanı üst
    tops: { title: "Tops", test: (p) => p.it.type === "apparel" && !isBottom(p), facets: ["color", "size", "price"] },
    bottoms: { title: "Bottoms", test: (p) => p.it.type === "apparel" && isBottom(p), facets: ["color", "size", "price"] },
    footwear: { title: "Footwear", test: (p) => p.it.type === "footwear", facets: ["color", "size", "price"] },
    accessories: { title: "Accessories", test: (p) => p.it.type === "accessory", facets: ["color", "price"] },
    all: { title: "All", test: () => true, facets: ["type", "color", "size", "price"] },
    favorites: {
      title: "Favorites",
      test: (p) => favs.p.has(`${p.look.id}:${p.k}`),
      facets: ["type", "color", "size", "price"],
      empty: () => favs.l.size
        ? { title: "No saved pieces yet", text: "Tap the heart on a piece to save it here." }
        : { title: "No favorites yet", text: "Tap the heart on a piece or a look to save it here." }
    }
  };
  // Üst ve alt giyimin alt türleri (mobil menü ve ürün alanı); ürün adından türetilir, ilk eşleşen kazanır
  const KINDS = {
    tops: [
      ["sweatshirt", "Sweatshirts", /hoodie|crew|fleece/i],
      ["tshirt", "T-shirts", /\btee\b|long sleeve/i],
      ["jacket", "Jackets", /jacket/i]
    ],
    bottoms: [
      ["shorts", "Shorts", /jort|short/i],
      ["jeans", "Jeans", /jean/i],
      ["sweatpants", "Sweatpants", /sweatpant/i],
      ["pants", "Pants", /pant|cargo/i]
    ]
  };
  const kindOf = (group, p) => (KINDS[group].find((k) => k[2].test(p.it.name)) || [])[0];
  const FACETS = {
    type: { label: "Category", values: (p) => [p.it.type], text: (v) => TYPE_LABEL[v] },
    color: { label: "Color", values: (p) => [p.it.color], text: (v) => v },
    size: { label: "Size", values: (p) => p.sizes, text: (v) => v },
    price: { label: "Price", values: (p) => [PRICE_BANDS.find((b) => b.test(p.it.price)).id], text: (v) => PRICE_BANDS.find((b) => b.id === v).label() }
  };

  let shopKey = null;                          // açık liste sayfası
  let cameFromShop = null;                     // ürün sayfasından "geri" nereye dönsün
  let shopFocus = null;
  const shopStates = {};                       // sayfa başına filtre, sıralama ve kaydırma konumu (bellekte)
  const shopState = (key) => (shopStates[key] ||= {
    sel: { type: new Set(), color: new Set(), size: new Set(), price: new Set() },
    sort: "featured", hide: false, scroll: 0
  });
  const filterMq = matchMedia("(max-width: 900px)");
  const xIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  const filterIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>`;

  // Bir ürün, seçili her filtre grubunda en az bir seçili değere uyuyorsa listede kalır (except: o grubu saymaz)
  const matches = (p, sel, except) => Object.keys(FACETS).every((f) =>
    f === except || !sel[f].size || FACETS[f].values(p).some((v) => sel[f].has(v)));

  function facetValues(f, base) {
    const set = new Set();
    base.forEach((p) => FACETS[f].values(p).forEach((v) => set.add(v)));
    if (f === "size") return [...set].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    if (f === "price") return PRICE_BANDS.map((b) => b.id).filter((id) => set.has(id));
    if (f === "type") return ["apparel", "footwear", "accessory"].filter((v) => set.has(v));
    return [...set].sort();
  }

  function facetHTML(f, base) {
    const F = FACETS[f];
    const vals = facetValues(f, base);
    let body;
    if (f === "color") body = vals.map((v) => `<button type="button" class="color-dot" data-facet="color" data-value="${v}" aria-pressed="false" aria-label="${v}" title="${v}" style="background:${swatchBg(v)}"></button>`).join("");
    else if (f === "size") body = vals.map((v) => `<button type="button" class="size-pill" data-facet="size" data-value="${v}" aria-pressed="false">${v}</button>`).join("");
    else body = vals.map((v) => `<label class="opt"><input type="checkbox" data-facet="${f}" data-value="${v}"><span>${F.text(v)}</span><span class="opt-count" data-count="${f}:${v}"></span></label>`).join("");
    return `<details class="facet" open><summary>${F.label}</summary><div class="facet-body facet-${f}">${body}</div></details>`;
  }

  const cardHTML = ({ look, k, it, isNew }) => `
    <li>
      ${favBtn(`p:${look.id}:${k}`, `Save ${it.name} to favorites`)}
      <a class="card-link" href="${pdpHref(look, k)}">
        <span class="card-img" style="${cropStyle(look, it.crop, 0.3)}">${isNew ? `<span class="card-badge">Just In</span>` : ""}</span>
        <span class="card-swatch" style="background:${swatchBg(it.color)}" title="${it.color}"></span>
        <span class="card-name">${it.name}</span>
        <span class="card-sub">${it.brand}</span>
        <span class="card-price">${money(it.price)}</span>
      </a>
    </li>`;

  function renderShop() {
    const cfg = SHOPS[shopKey], st = shopState(shopKey);
    const base = PRODUCTS.filter(cfg.test);
    shopEl.classList.remove("is-filters-open");
    shopEl.innerHTML = `
      <div class="shop-inner">
        <div class="shop-head">
          <nav class="shop-crumbs" aria-label="Breadcrumb"><a href="#">Looks</a> / <span>${cfg.title}</span></nav>
          <h1 class="shop-title" tabindex="-1">${cfg.title}</h1>
          ${shopKey === "favorites" ? favLooksHTML() : ""}
        </div>
        <div class="shop-bar">
          <p class="shop-count" data-shop-count aria-live="polite"></p>
          <div class="shop-controls">
            <button class="shop-toggle" type="button" data-filters-toggle aria-expanded="true">${filterIcon}<span data-filters-label>Hide Filters</span></button>
            <label class="sort-pick"><span>Sort by</span>
              <select data-sort>
                <option value="featured"${st.sort === "featured" ? " selected" : ""}>Featured</option>
                <option value="price-asc"${st.sort === "price-asc" ? " selected" : ""}>Price: Low to High</option>
                <option value="price-desc"${st.sort === "price-desc" ? " selected" : ""}>Price: High to Low</option>
              </select>
            </label>
          </div>
        </div>
        <div class="shop-body" data-shop-body>
          <aside class="shop-filters" aria-label="Filters">
            <div class="filters-head"><h2>Filters</h2><button class="icon-btn" type="button" data-filters-close aria-label="Close filters">${xIcon}</button></div>
            <div class="filters-scroll">${cfg.facets.map((f) => facetHTML(f, base)).join("")}</div>
            <div class="filters-foot"><button class="button-primary" type="button" data-filters-close data-filters-show>Show results</button></div>
          </aside>
          <div class="shop-main">
            <div class="shop-chips" data-chips></div>
            <ul class="shop-grid" data-grid></ul>
            <div class="shop-empty" data-empty hidden>
              <h2>No pieces match</h2>
              <p>Try removing a filter to see more.</p>
              <button class="button-secondary" type="button" data-clear>Clear filters</button>
              <a class="button-secondary co-btn" href="#/shop/new" data-browse hidden>Browse new arrivals</a>
            </div>
          </div>
        </div>
      </div>`;
    updateShop();
    syncFilterToggle();
  }

  function updateShop() {
    const cfg = SHOPS[shopKey], st = shopState(shopKey);
    const base = PRODUCTS.filter(cfg.test);
    let list = base.filter((p) => matches(p, st.sel));
    if (cfg.rank && st.sort === "featured") list = [...list].sort((a, b) => cfg.rank(b) - cfg.rank(a));   // arama: en alakalı önce
    if (st.sort === "price-asc") list = [...list].sort((a, b) => a.it.price - b.it.price);
    else if (st.sort === "price-desc") list = [...list].sort((a, b) => b.it.price - a.it.price);

    $("[data-shop-count]", shopEl).textContent = `${list.length} ${list.length === 1 ? "piece" : "pieces"}`;
    $("[data-filters-show]", shopEl).textContent = `Show ${list.length} results`;

    // kenar çubuğu: seçili durum ve her seçeneğin sonuç sayısı (diğer filtreler uygulanmış halde)
    shopEl.querySelectorAll("[data-facet]").forEach((el) => {
      const f = el.dataset.facet, v = el.dataset.value, on = st.sel[f].has(v);
      const n = base.filter((p) => matches(p, st.sel, f) && FACETS[f].values(p).includes(v)).length;
      if (el.type === "checkbox") el.checked = on; else el.setAttribute("aria-pressed", on);
      (el.closest(".opt") || el).classList.toggle("is-empty", n === 0 && !on);
      const c = $(`[data-count="${f}:${v}"]`, shopEl);
      if (c) c.textContent = `(${n})`;
    });

    const chips = [];
    Object.keys(st.sel).forEach((f) => st.sel[f].forEach((v) =>
      chips.push(`<button type="button" class="chip" data-chip="${f}" data-value="${v}" aria-label="Remove filter ${FACETS[f].text(v)}">${FACETS[f].text(v)}${xIcon}</button>`)));
    $("[data-chips]", shopEl).innerHTML = chips.length ? chips.join("") + `<button type="button" class="chip-clear" data-clear>Clear all</button>` : "";

    $("[data-grid]", shopEl).innerHTML = list.map(cardHTML).join("");
    // koleksiyonda hiç ürün yoksa (arama sonucu ya da favori yok) filtre yerine yönlendirici mesaj gösterilir
    const emptyMsg = !base.length && cfg.empty ? (typeof cfg.empty === "function" ? cfg.empty() : cfg.empty) : null;
    const empty = $("[data-empty]", shopEl);
    empty.hidden = list.length > 0;
    $("h2", empty).textContent = emptyMsg ? emptyMsg.title : "No pieces match";
    $("p", empty).textContent = emptyMsg ? emptyMsg.text : "Try removing a filter to see more.";
    $("[data-clear]", empty).hidden = !!emptyMsg;
    $("[data-browse]", empty).hidden = !emptyMsg;
  }

  function syncFilterToggle() {
    const st = shopState(shopKey);
    const btn = $("[data-filters-toggle]", shopEl);
    if (!btn) return;
    $("[data-shop-body]", shopEl).classList.toggle("is-filters-hidden", st.hide);
    if (filterMq.matches) {
      $("[data-filters-label]", shopEl).textContent = "Filters";
      btn.setAttribute("aria-expanded", shopEl.classList.contains("is-filters-open"));
    } else {
      $("[data-filters-label]", shopEl).textContent = st.hide ? "Show Filters" : "Hide Filters";
      btn.setAttribute("aria-expanded", !st.hide);
    }
  }
  filterMq.addEventListener("change", () => { shopEl.classList.remove("is-filters-open"); if (shopKey) syncFilterToggle(); });

  function setFacet(f, v, on) {
    const s = shopState(shopKey).sel[f];
    if (on) s.add(v); else s.delete(v);
    updateShop();
  }

  shopEl.addEventListener("click", (e) => {
    const st = shopKey && shopState(shopKey);
    const dot = e.target.closest("button[data-facet]");
    const chip = e.target.closest("[data-chip]");
    if (dot) setFacet(dot.dataset.facet, dot.dataset.value, dot.getAttribute("aria-pressed") !== "true");
    else if (chip) setFacet(chip.dataset.chip, chip.dataset.value, false);
    else if (e.target.closest("[data-clear]")) { Object.values(st.sel).forEach((s) => s.clear()); updateShop(); }
    else if (e.target.closest("[data-filters-toggle]")) {
      if (filterMq.matches) shopEl.classList.add("is-filters-open"); else st.hide = !st.hide;
      syncFilterToggle();
    } else if (e.target.closest("[data-filters-close]")) { shopEl.classList.remove("is-filters-open"); syncFilterToggle(); }
  });
  shopEl.addEventListener("change", (e) => {
    if (e.target.matches("input[data-facet]")) setFacet(e.target.dataset.facet, e.target.dataset.value, e.target.checked);
    else if (e.target.matches("[data-sort]")) { shopState(shopKey).sort = e.target.value; updateShop(); }
  });

  function openShop(key) {
    if (state.shopOpen && shopKey && shopKey !== key) shopState(shopKey).scroll = shopEl.scrollTop;
    if (!state.shopOpen) shopFocus = document.activeElement;
    shopKey = key; cameFromShop = key;
    renderShop();
    state.shopOpen = true;
    shopEl.classList.add("is-open");
    shopEl.removeAttribute("inert"); shopEl.setAttribute("aria-hidden", "false");
    pageEl.setAttribute("inert", "");
    shopEl.scrollTop = shopState(key).scroll;
    document.title = `${SHOPS[key].title} — ALTÉ`;
    $(".shop-title", shopEl).focus({ preventScroll: true });
  }

  function closeShop() {
    if (!state.shopOpen) return;
    shopState(shopKey).scroll = shopEl.scrollTop;
    state.shopOpen = false;
    shopEl.classList.remove("is-open", "is-filters-open");
    shopEl.setAttribute("inert", ""); shopEl.setAttribute("aria-hidden", "true");
    pageEl.removeAttribute("inert");
    document.title = BASE_TITLE;
  }

  /* ---------- Favorites ---------- */
  // Parçalar ve look'lar kalp ile kaydedilir; tarayıcıda saklanır. Aynı parçanın tekrar eden kopyaları tek favori sayılır.
  const FAV_KEY = "lobby-fav";
  const favs = { p: new Set(), l: new Set() };      // p: parça ("05:1"), l: look ("05")
  try {
    const saved = JSON.parse(localStorage.getItem(FAV_KEY)) || {};
    (saved.p || []).forEach((k) => favs.p.add(k));
    (saved.l || []).forEach((k) => favs.l.add(k));
  } catch {}
  const favNav = $("[data-fav-nav]");
  const favCount = $("[data-fav-count]");
  const heartIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.35-9.33-8.8C.9 8.9 2.7 5 6.4 5c2.1 0 3.6 1.1 5.6 3.2C14 6.1 15.5 5 17.6 5c3.7 0 5.5 3.9 3.73 7.2C19 16.65 12 21 12 21Z"/></svg>`;

  const isFav = (id) => (id[0] === "p" ? favs.p.has(id.slice(2)) : id[0] === "l" ? favs.l.has(id.slice(2)) : false);
  const pieceFavId = (look, k) => { const c = PRODUCT_OF.get(`${look.id}:${k}`); return `p:${c.look.id}:${c.k}`; };
  function favBtn(id, label, cls = "") {
    return `<button type="button" class="fav-btn ${cls}" data-fav="${id}" aria-pressed="${isFav(id)}" aria-label="${label}">${heartIcon}</button>`;
  }

  // Favoriler sayfasının üstündeki "kaydedilen looklar" şeridi
  function favLooksHTML() {
    const list = LOOKS.filter((l) => favs.l.has(l.id));
    return `<section class="fav-looks" data-fav-looks aria-labelledby="fav-looks-h"${list.length ? "" : " hidden"}>
      <h2 id="fav-looks-h">Saved looks</h2>
      <ul>${list.map((l) => `
        <li>
          ${favBtn(`l:${l.id}`, "Save this look to favorites")}
          <a class="fav-look" href="#/look/${l.id}">
            <span class="fav-look-img" style="background-image:url('${l.src}')"></span>
            <span class="fav-look-name" translate="no">Look ${l.id}, ${l.name}</span>
          </a>
        </li>`).join("")}</ul>
    </section>`;
  }

  function syncFavs() {
    document.querySelectorAll("[data-fav]").forEach((b) => b.setAttribute("aria-pressed", isFav(b.dataset.fav)));
    const n = favs.p.size + favs.l.size;
    favCount.textContent = n;
    favCount.classList.toggle("has-items", n > 0);
    favNav.setAttribute("aria-label", n ? `Favorites, ${n} items` : "Favorites");
    if (state.shopOpen && shopKey === "favorites") {
      const holder = $("[data-fav-looks]", shopEl);
      if (holder) holder.outerHTML = favLooksHTML();
      updateShop();
    }
  }

  function toggleFav(id) {
    if (!id) return;
    const set = id[0] === "p" ? favs.p : favs.l;
    const key = id.slice(2);
    const on = !set.has(key);
    if (on) set.add(key); else set.delete(key);
    try { localStorage.setItem(FAV_KEY, JSON.stringify({ p: [...favs.p], l: [...favs.l] })); } catch {}
    syncFavs();
    toast(on ? "Saved to favorites" : "Removed from favorites");
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-fav]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    toggleFav(b.dataset.fav);
    if (b.isConnected) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
  });

  /* ---------- Search ---------- */
  const searchWrap = $(".search-wrap");
  const searchInput = $("[data-search-input]");
  const suggestEl = $("[data-suggest]");
  const primaryNav = $(".primary-nav");
  const navMq = matchMedia("(max-width: 960px)");
  let searchQuery = "";
  let suggestItems = [];                       // önerilen ürünler (sıralı)
  let suggestActive = -1;                      // klavyeyle seçili satır; en sondaki "tümünü gör" satırıdır

  // Büyük/küçük harf ve aksan duyarsız: "Kırmızı", "kirmizi" ve "KIRMIZI" aynı sayılır
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
  // Türkçe karşılıklar aranabilsin diye ürün türüne göre ek anahtar kelimeler
  const SEARCH_EXTRA = [
    [/hoodie/i, "kapsonlu sweatshirt"], [/pant|jean|jort|cargo/i, "pantolon"], [/jort/i, "sort"],
    [/tee|crew|sleeve|thermal/i, "tisort"], [/cap|durag/i, "sapka bere"], [/bag/i, "canta"],
    [/loafer|boot|derby|low|hi top|slide/i, "ayakkabi"]
  ];
  function hayOf(p) {
    return (p.hay ||= norm([
      p.it.name, p.it.brand, p.it.color, I18N.t(p.it.color), TYPE_LABEL[p.it.type], I18N.t(TYPE_LABEL[p.it.type]),
      ...SEARCH_EXTRA.filter(([re]) => re.test(p.it.name)).map(([, w]) => w)
    ].join(" ")));
  }
  // Her kelime ürünün metninde geçmeli; ad başında geçen kelime daha yüksek puan alır
  function searchScore(p, q) {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return 0;
    const hay = hayOf(p), name = norm(p.it.name);
    let score = 0;
    for (const tk of tokens) {
      // 1-3 harfli kelimeler yalnızca kelime başında eşleşir ("red", "Flared" içinde geçmesin); uzunlar her yerde
      if (!(tk.length <= 3 ? (" " + hay).includes(" " + tk) : hay.includes(tk))) return 0;
      score += name.startsWith(tk) ? 4 : name.includes(" " + tk) ? 3 : name.includes(tk) ? 2 : 1;
    }
    return score;
  }
  const searchProducts = (q) => PRODUCTS.map((p) => ({ p, score: searchScore(p, q) })).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  const shopHash = (key) => (key === "search" ? `#/search/${encodeURIComponent(searchQuery)}` : key === "favorites" ? "#/favorites" : key === "catalog" ? "#" : `#/shop/${key}`);

  function setSuggestActive(i) {
    suggestActive = i;
    const opts = [...suggestEl.querySelectorAll('[role="option"]')];
    opts.forEach((o, k) => { o.classList.toggle("is-active", k === i); o.setAttribute("aria-selected", k === i); });
    if (i >= 0 && opts[i]) { searchInput.setAttribute("aria-activedescendant", opts[i].id); opts[i].scrollIntoView({ block: "nearest" }); }
    else searchInput.removeAttribute("aria-activedescendant");
  }

  function closeSuggest() {
    suggestEl.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
    suggestActive = -1;
  }

  function renderSuggest() {
    const q = searchInput.value.trim();
    if (!q) { closeSuggest(); return; }
    const results = searchProducts(q);
    suggestItems = results.slice(0, 6).map((r) => r.p);
    suggestActive = -1;
    suggestEl.innerHTML = results.length
      ? `<ul class="suggest-list">
          ${suggestItems.map((p, i) => `
            <li role="option" id="sug-${i}" aria-selected="false">
              <a class="suggest-item" href="${pdpHref(p.look, p.k)}" tabindex="-1">
                <span class="suggest-thumb" style="${cropStyle(p.look, p.it.crop, 0.3)}"></span>
                <span class="suggest-text"><span class="suggest-name">${p.it.name}</span><span class="suggest-meta">${p.it.brand}</span></span>
                <span class="suggest-price">${money(p.it.price)}</span>
              </a>
            </li>`).join("")}
          <li role="option" id="sug-all" aria-selected="false">
            <a class="suggest-all" href="#/search/${encodeURIComponent(q)}" tabindex="-1">See all ${results.length} results</a>
          </li>
        </ul>`
      : `<p class="suggest-empty">No results for “${esc(q)}”</p>`;
    suggestEl.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  }

  function submitSearch() {
    const q = searchInput.value.trim();
    if (!q) return;
    closeSuggest();
    closeMobileSearch();
    searchInput.blur();
    location.hash = `#/search/${encodeURIComponent(q)}`;
  }

  function openMobileSearch() {
    primaryNav.classList.add("is-searching");
    void searchInput.offsetWidth;                // girdi görünür olsun, sonra odaklan
    searchInput.focus();
  }
  function closeMobileSearch() {
    primaryNav.classList.remove("is-searching");
  }
  function focusSearch() {
    if (navMq.matches) openMobileSearch(); else searchInput.focus();
    searchInput.select();
  }

  searchInput.addEventListener("input", renderSuggest);
  searchInput.addEventListener("focus", () => { if (searchInput.value.trim()) renderSuggest(); });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestEl.hidden) renderSuggest();
      if (suggestEl.hidden || !suggestEl.querySelector('[role="option"]')) return;
      const optCount = suggestEl.querySelectorAll('[role="option"]').length;
      setSuggestActive(((suggestActive + 1 + (e.key === "ArrowDown" ? 1 : -1) + optCount + 1) % (optCount + 1)) - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestActive >= 0 && suggestActive < suggestItems.length) {
        const p = suggestItems[suggestActive];
        closeSuggest(); closeMobileSearch(); searchInput.blur();
        location.hash = pdpHref(p.look, p.k);
      } else submitSearch();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (!suggestEl.hidden) closeSuggest();
      else if (searchInput.value) { searchInput.value = ""; }
      else { closeMobileSearch(); searchInput.blur(); }
    }
  });
  // mobilde simgeye dokununca arama modu açılır
  $(".search-pill").addEventListener("click", () => {
    if (navMq.matches && !primaryNav.classList.contains("is-searching")) openMobileSearch();
  });
  $("[data-search-close]").addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    closeSuggest(); closeMobileSearch(); searchInput.blur();
  });
  document.addEventListener("pointerdown", (e) => {
    if (!searchWrap.contains(e.target)) { closeSuggest(); closeMobileSearch(); }
  });
  navMq.addEventListener("change", closeMobileSearch);

  // #/search/kelime adresi: sonuçlar liste sayfasında gösterilir (filtre ve sıralama dahil)
  function openSearch(q) {
    if (q !== searchQuery) delete shopStates.search;
    searchQuery = q;
    SHOPS.search = {
      title: `Results for “${q}”`,
      test: (p) => searchScore(p, q) > 0,
      rank: (p) => searchScore(p, q),
      facets: ["type", "color", "size", "price"],
      empty: { title: "No results found", text: "Check the spelling or try a more general word." }
    };
    searchInput.value = q;
    openShop("search");
  }

  /* ---------- Catalog (showroom'un altındaki ürün alanı, yalnızca masaüstü) ---------- */
  const catalogEl = $("[data-catalog]");
  const catalogGrid = $("[data-catalog-grid]");
  const pagerEl = $("[data-pager]");
  const PAGE_ROWS = 4;                           // "Hepsi" filtresinde sayfa başına satır sayısı
  // sayfa başına ürün = 4 satır x ekrandaki sütun sayısı (sütun sayısı genişliğe göre değişir)
  const pageSize = () => {
    const cols = getComputedStyle(catalogGrid).gridTemplateColumns.split(" ").filter((c) => c.endsWith("px")).length;
    return PAGE_ROWS * (cols || 5);
  };
  let catalogKey = "all";
  let catalogSub = "all";                        // üst/alt giyimde seçili tür (sweatshirt, jeans...)
  let catalogPage = 1;
  const subsEl = $("[data-catalog-subs]");

  const arrowRight = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>`;
  function pagerHTML(page, pages) {
    const nums = Array.from({ length: pages }, (_, i) => i + 1);
    return `
      <button type="button" class="pager-btn" data-page="${page - 1}" aria-label="Previous page"${page === 1 ? " disabled" : ""}>${arrowLeft}</button>
      ${nums.map((n) => `<button type="button" class="pager-btn" data-page="${n}" aria-label="Page ${n}"${n === page ? ' aria-current="page"' : ""}>${n}</button>`).join("")}
      <button type="button" class="pager-btn" data-page="${page + 1}" aria-label="Next page"${page === pages ? " disabled" : ""}>${arrowRight}</button>`;
  }

  function renderCatalog() {
    const cfg = SHOPS[catalogKey];
    const kinds = KINDS[catalogKey];
    const list = PRODUCTS.filter(cfg.test).filter((p) => !kinds || catalogSub === "all" || kindOf(catalogKey, p) === catalogSub);
    subsEl.hidden = !kinds;
    subsEl.innerHTML = kinds
      ? [["all", catalogKey === "tops" ? "All tops" : "All bottoms"], ...kinds].map(([id, label]) =>
          `<button type="button" class="cat-sub" data-sub="${id}" aria-pressed="${id === catalogSub}">${label}</button>`).join("")
      : "";
    // yalnızca "Hepsi" sayfalara bölünür (sayfa başına 4 satır); diğer filtrelerde hepsi birden görünür
    const size = pageSize();
    const pages = catalogKey === "all" ? Math.ceil(list.length / size) : 1;
    catalogPage = Math.max(1, Math.min(catalogPage, pages));
    const shown = pages > 1 ? list.slice((catalogPage - 1) * size, catalogPage * size) : list;
    $("[data-catalog-title]").textContent = cfg.title;
    $("[data-catalog-count]").textContent = `${list.length} pieces`;
    $("[data-catalog-all]").setAttribute("href", `#/shop/${catalogKey}`);
    catalogEl.querySelectorAll("[data-cat]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.cat === catalogKey));
    catalogGrid.innerHTML = shown.map(cardHTML).join("");
    pagerEl.hidden = pages <= 1;
    pagerEl.innerHTML = pages > 1 ? pagerHTML(catalogPage, pages) : "";
  }
  // pencere genişliği değişince sütun sayısı, dolayısıyla sayfa başına ürün de değişir
  let catalogCols = 0;
  addEventListener("resize", () => {
    if (navMq.matches || catalogKey !== "all") return;
    const cols = getComputedStyle(catalogGrid).gridTemplateColumns.split(" ").length;
    if (cols !== catalogCols) { catalogCols = cols; renderCatalog(); }
  });
  function setCatalog(key, sub = "all") {
    if (!SHOPS[key] || (key === catalogKey && sub === catalogSub)) return;
    catalogKey = key;
    catalogSub = KINDS[key] && KINDS[key].some((k) => k[0] === sub) ? sub : "all";
    catalogPage = 1;
    renderCatalog();
    syncNavSpy();
    if (navMq.matches) syncMobileNav();
  }

  /* Sayfa gibi kaydırma: showroom ile ürün alanı arasında yarım kalma yok.
     Aşağı doğru yaklaşık %10'luk bir hareket bile ürün alanına indirir; yukarı çıkınca showroom'a döner. */
  const catalogStartY = () => Math.max(0, catalogEl.offsetTop - $(".site-head").offsetHeight);
  let snapping = false, snapTarget = 0, stable = "top", wheelAcc = 0, wheelAt = 0, snapTimer = 0, snapGuard = 0;
  function snapTo(y) {
    snapping = true;
    snapTarget = Math.min(y, Math.max(0, document.documentElement.scrollHeight - innerHeight));   // kaydırılabilecek en son konumu aşma
    stable = y === 0 ? "top" : "cat";
    window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    // geçiş hedefe varınca biter (scroll olayında kontrol edilir); yavaş cihazlar için güvenlik süresi
    clearTimeout(snapGuard);
    snapGuard = setTimeout(() => { snapping = false; }, reduceMotion ? 80 : 3000);
  }
  const pageScrollOn = () => !navMq.matches && !wasLocked;

  addEventListener("wheel", (e) => {
    if (!pageScrollOn() || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.target.closest && e.target.closest(".search-suggest, .fav-looks ul")) return;
    const y = scrollY, cy = catalogStartY();
    if (e.deltaY > 0 && y < cy - 2) {
      e.preventDefault();
      if (snapping) return;
      const now = performance.now();
      wheelAcc = now - wheelAt > 300 ? 0 : wheelAcc;
      wheelAt = now;
      wheelAcc += e.deltaY;
      if (wheelAcc >= 30) { wheelAcc = 0; snapTo(cy); }
    } else if (e.deltaY < 0 && y > 0 && y <= cy + 2) {
      e.preventDefault();
      if (!snapping) snapTo(0);
    }
  }, { passive: false });

  // Kaydırma çubuğunu sürüklemek gibi diğer yollar: durunca %10 kuralına göre bir tarafa oturur
  function settleScroll() {
    if (!pageScrollOn() || snapping) return;
    const y = scrollY, cy = catalogStartY();
    if (y <= 2) { stable = "top"; return; }
    if (y >= cy - 2) { stable = "cat"; return; }
    const frac = y / cy;
    snapTo(stable === "top" ? (frac >= 0.1 ? cy : 0) : (frac <= 0.9 ? 0 : cy));
  }
  addEventListener("scroll", () => {
    if (snapping && Math.abs(scrollY - snapTarget) <= 2) { snapping = false; clearTimeout(snapGuard); }   // hedefe vardı
    clearTimeout(snapTimer);
    snapTimer = setTimeout(settleScroll, 140);
  }, { passive: true });

  // Menüdeki Giyim ve NEW DROP: sayfanın aşağısındaki ürün alanına iner ve o filtreyi seçer
  function goCatalog(key) {
    const scrollDown = () => {
      setCatalog(key);
      snapTo(catalogStartY());
    };
    if (location.hash) { location.hash = ""; setTimeout(scrollDown, 80); } else scrollDown();
  }
  catalogEl.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-cat]");
    const pg = e.target.closest("[data-page]");
    const sub = e.target.closest("[data-sub]");
    if (sub) setCatalog(catalogKey, sub.dataset.sub);
    else if (chip) setCatalog(chip.dataset.cat);
    else if (pg && !pg.disabled) {
      catalogPage = Number(pg.dataset.page);
      renderCatalog();
      snapTo(catalogStartY());                   // sayfa değişince ürünlerin başına dön
    } else if (e.target.closest(".card-link")) cameFromShop = "catalog";   // üründen "geri" buraya döner
  });
  document.querySelectorAll('.nav-links a[data-nav="new"], .nav-links a[data-nav="clothing"]').forEach((a) => a.addEventListener("click", (e) => {
    if (navMq.matches) return;                   // mobil: eskisi gibi ayrı sayfaya gider
    e.preventDefault();
    goCatalog(a.dataset.nav === "new" ? "new" : "all");     // Giyim: ürün alanında "Hepsi"
  }));
  const scrollTop = () => { lockY = 0; snapTo(0); };
  $('.nav-links a[data-nav="looks"]').addEventListener("click", () => { if (!navMq.matches) scrollTop(); });

  /* Mobil: showroom'dan yukarı kaydırınca ürün alanına geçilir; ürün alanı en üstteyken aşağı çekince (ya da ALTÉ / Looks ile) showroom'a dönülür. */
  const htmlEl = document.documentElement;
  const inCatalogView = () => htmlEl.classList.contains("m-catalog");
  function setMobileView(view, animate = true) {
    const on = view === "catalog";
    if (!navMq.matches || on === inCatalogView()) return;
    htmlEl.classList.toggle("m-catalog", on);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (on) {
      catalogEl.classList.remove("m-enter");
      if (animate) { void catalogEl.offsetWidth; catalogEl.classList.add("m-enter"); }
    } else {
      measure(); state.dirty = true; state.elapsed = 0;       // showroom gizliyken ölçüler sıfırlanmış olabilir
    }
    syncMobileNav();
  }
  // menüde ürün alanındaki seçime karşılık gelen öğeyi işaretle ve ilgili alt listeyi aç
  function syncMobileNav() {
    if (!navMq.matches || state.pdpOpen || state.shopOpen || state.coOpen || state.infoOpen) return;
    const cat = inCatalogView();
    setNav(cat ? catalogKey : "looks");
    menuEl.querySelectorAll("[data-m-sub]").forEach((a) => {
      const on = cat && a.dataset.mCat === catalogKey && a.dataset.mSub === catalogSub;
      a.classList.toggle("is-active", on);
    });
    menuEl.querySelectorAll(".nav-group").forEach((g) => {
      if (cat && $(".nav-group-btn", g).dataset.nav === catalogKey) setGroup(g, true);
    });
  }
  function goMobileCatalog(key, sub = "all") {
    setCatalog(key, sub);
    setMobileView("catalog");
    syncMobileNav();
    if (location.hash) location.hash = "";                      // açık sayfa ve look paneli kapanır
  }

  const mobileShowroomOn = () => navMq.matches && !inCatalogView() && !wasLocked && state.mode === "ring" && state.intro >= 1;
  /* Parmakla yukarı sürüklerken showroom parmağı izleyerek yukarı kayar ve altından ürün alanı görünür.
     Parmak kalkınca ekranın %10'u ya da daha fazlası sürüklenmişse ürün alanına geçilir, değilse showroom yerine döner. */
  const PEEK_COMMIT = 0.1;
  let swipe = null, peek = null;                  // peek: sürükleme sırasında { h: kayma yüksekliği, dy: o anki kayma }
  const peekH = () => innerHeight - headEl.offsetHeight;
  // back: ürün alanından aşağı çekince showroom üstten iner (ürün alanı en üstteyken)
  function peekSet(dy, back = false) {
    if (!peek) {
      peek = { h: peekH(), dy: 0, back };
      htmlEl.style.setProperty("--head-h", `${headEl.offsetHeight}px`);
      htmlEl.classList.remove("m-anim");
      htmlEl.classList.add(back ? "m-back" : "m-drag");
      if (back) { measure(); state.dirty = true; }        // showroom gizliyken ölçüler sıfırlanmıştı
    }
    peek.dy = Math.max(0, Math.min(peek.h, dy));
    if (peek.back) {
      showroom.style.transform = `translateY(${peek.dy - peek.h}px)`;
      catalogEl.style.transform = `translateY(${peek.dy}px)`;
    } else {
      showroom.style.transform = `translateY(${-peek.dy}px)`;
      catalogEl.style.transform = `translateY(${peek.h - peek.dy}px)`;
    }
  }
  function peekEnd(commit) {
    if (!peek) return;
    const { h, back } = peek;
    peek = null;
    htmlEl.classList.add("m-anim");
    if (back) {
      showroom.style.transform = `translateY(${commit ? 0 : -h}px)`;
      catalogEl.style.transform = `translateY(${commit ? h : 0}px)`;
    } else {
      showroom.style.transform = `translateY(${commit ? -h : 0}px)`;
      catalogEl.style.transform = `translateY(${commit ? 0 : h}px)`;
    }
    setTimeout(() => {
      htmlEl.classList.remove("m-anim", "m-drag", "m-back");
      showroom.style.transform = catalogEl.style.transform = "";
      if (commit) setMobileView(back ? "showroom" : "catalog", false);
    }, reduceMotion ? 30 : 380);
  }
  document.addEventListener("touchstart", (e) => {
    swipe = e.touches.length === 1 && !peek && mobileShowroomOn() ? { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null } : null;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!swipe || !mobileShowroomOn()) return;
    const dy = swipe.y - e.touches[0].clientY, dx = Math.abs(swipe.x - e.touches[0].clientX);
    if (!swipe.axis) {                           // ilk birkaç pikselde yön belirlenir: dikey ise sayfa geçişi, yatay ise look döndürme
      if (Math.abs(dy) < 8 && dx < 8) return;
      swipe.axis = dy > 0 && dy > dx * 1.2 ? "v" : "h";
    }
    if (swipe.axis === "v") peekSet(dy);
  }, { passive: true });
  const swipeEnd = () => {
    if (swipe && swipe.axis === "v" && peek) peekEnd(peek.dy >= peek.h * PEEK_COMMIT);
    swipe = null;
  };
  document.addEventListener("touchend", swipeEnd, { passive: true });
  document.addEventListener("touchcancel", swipeEnd, { passive: true });
  // Ürün alanı en üstteyken parmakla aşağı çekince showroom'a dönülür (%10 kuralı aynı)
  let bswipe = null;
  const catalogTop = () => navMq.matches && inCatalogView() && !wasLocked && window.scrollY <= 0;
  catalogEl.addEventListener("touchstart", (e) => {
    bswipe = e.touches.length === 1 && !peek && catalogTop() ? { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null } : null;
  }, { passive: true });
  catalogEl.addEventListener("touchmove", (e) => {
    if (!bswipe) return;
    const dy = e.touches[0].clientY - bswipe.y, dx = Math.abs(e.touches[0].clientX - bswipe.x);
    if (!bswipe.axis) {
      if (Math.abs(dy) < 8 && dx < 8) return;
      bswipe.axis = dy > 0 && dy > dx * 1.2 && window.scrollY <= 0 ? "v" : "x";
    }
    if (bswipe.axis !== "v") return;
    if (e.cancelable) e.preventDefault();       // tarayıcının kendi aşağı çekme hareketi araya girmesin
    peekSet(dy, true);
  }, { passive: false });
  const bswipeEnd = () => {
    if (bswipe && bswipe.axis === "v" && peek) peekEnd(peek.dy >= peek.h * PEEK_COMMIT);
    bswipe = null;
  };
  catalogEl.addEventListener("touchend", bswipeEnd, { passive: true });
  catalogEl.addEventListener("touchcancel", bswipeEnd, { passive: true });
  // dar pencerede fare tekerleği (masaüstünde pencereyi daraltınca)
  addEventListener("wheel", (e) => {
    if (mobileShowroomOn() && !peek && e.deltaY > 30 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { peekSet(1); peekEnd(true); }
    else if (catalogTop() && !peek && e.deltaY < -30 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { peekSet(1, true); peekEnd(true); }
  }, { passive: true });
  navMq.addEventListener("change", () => { if (!navMq.matches) { htmlEl.classList.remove("m-catalog"); } else syncMobileNav(); });

  // Kaydırırken menüde hangi bölümde olduğunu işaretle
  function syncNavSpy() {
    if (navMq.matches || state.pdpOpen || state.shopOpen || state.coOpen || state.infoOpen) return;
    const inCatalog = catalogEl.getBoundingClientRect().top <= innerHeight * 0.5;
    // aşağıdayken menüde hangi filtre seçili olursa olsun "Giyim" işaretli kalır; yalnızca NEW DROP seçiliyse o işaretlenir
    setNav(inCatalog ? (catalogKey === "new" ? "new" : "clothing") : "looks");
  }
  let spyRaf = 0;
  addEventListener("scroll", () => { cancelAnimationFrame(spyRaf); spyRaf = requestAnimationFrame(syncNavSpy); }, { passive: true });
  // showroom ekranda değilken otomatik geçiş beklesin
  new IntersectionObserver(([en]) => { state.offscreen = !en.isIntersecting; }, { threshold: 0.15 }).observe(showroom);

  // Üstte sayfa ya da çekmece açıkken arkadaki sayfa kaymasın
  // Kilit açılınca sayfa, kilitlenmeden önceki kaydırma konumuna döner ("#" bağlantıları tarayıcıyı başa atar)
  let lockY = 0, wasLocked = false;
  function updateLock() {
    const on = !!(state.pdpOpen || state.shopOpen || state.coOpen || state.infoOpen || state.bagOpen || state.menuOpen || state.mode === "detail");
    if (on === wasLocked) return;
    if (on) lockY = window.scrollY;
    document.documentElement.classList.toggle("is-locked", on);
    if (!on) window.scrollTo({ top: lockY, behavior: "instant" });
    wasLocked = on;
  }

  /* ---------- Info pages (Help, Find a store, Join us, Sign in) ---------- */
  const infoEl = $("[data-info]");
  const INFO_ROUTES = { "#/help": "help", "#/stores": "stores", "#/join": "join", "#/signin": "signin" };
  const INFO_TITLES = { help: "Help", stores: "Find a store", join: "Join us", signin: "Sign in" };
  let infoFocus = null;

  const faqItems = () => [
    ["How long does shipping take?", `Standard shipping takes 3 to 5 business days. Express takes 1 to 2 business days. Orders over ${moneyShort(FREE_SHIP)} ship free.`],
    ["Can I return an item?", "Yes. Return unworn pieces within 30 days for a full refund."],
    ["How do I find my size?", "Every product page lists the available sizes. Our fits are relaxed and oversized, so most people stay true to size."],
    ["Which payment methods do you accept?", "This is a demo store, so no real payments are taken. A live store would list cards and local payment methods here."],
    ["Can I change my order?", "You can change or cancel an order until it is packed. Contact us as soon as possible."],
    ["How do I contact you?", "Write to support@alte.example and we will reply within one business day."]
  ];
  const STORES = [
    ["ALTÉ Istanbul", "Sample Street 12, Beşiktaş, İstanbul"],
    ["ALTÉ Ankara", "Sample Avenue 34, Çankaya, Ankara"],
    ["ALTÉ İzmir", "Sample Road 56, Alsancak, İzmir"]
  ];
  const infoField = (id, label, type, ac) => `
    <div class="field is-wide">
      <label for="in-${id}">${label}</label>
      <input id="in-${id}" name="${id}" type="${type}" autocomplete="${ac}" aria-describedby="in-err-${id}">
      <p class="field-error" id="in-err-${id}" data-err="${id}" hidden></p>
    </div>`;
  const infoBack = () => `<a class="pdp-back" href="#">${arrowLeft} Back to shopping</a>`;

  function infoPage(key) {
    let body = "";
    if (key === "help") {
      body = `<h1 class="info-title" tabindex="-1">Help</h1>
        <p class="info-lead">Answers to the questions we hear most.</p>
        <div class="faq">${faqItems().map(([q, a]) => `<details class="pdp-row"><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`;
    } else if (key === "stores") {
      body = `<h1 class="info-title" tabindex="-1">Find a store</h1>
        <p class="info-lead">Visit a ALTÉ store to try the looks in person.</p>
        <ul class="store-list">${STORES.map(([n, a]) => `<li class="store"><h3 translate="no">${n}</h3><p translate="no">${a}</p><p>Open daily 10:00 to 22:00</p></li>`).join("")}</ul>
        <p class="info-note">These are sample locations for the demo.</p>`;
    } else if (key === "join") {
      body = `<h1 class="info-title" tabindex="-1">Join us</h1>
        <p class="info-lead">Create a free membership to hear about new drops first.</p>
        <form class="info-form" data-info-form="join" novalidate>
          ${infoField("firstName", "First name", "text", "given-name")}
          ${infoField("email", "Email", "email", "email")}
          <button class="button-primary" type="submit">Create membership</button>
        </form>
        <p class="info-note">This is a demo store. No account is created and nothing is saved.</p>`;
    } else {
      body = `<h1 class="info-title" tabindex="-1">Sign in</h1>
        <p class="info-lead">Enter your email and we will send you a sign-in link.</p>
        <form class="info-form" data-info-form="signin" novalidate>
          ${infoField("email", "Email", "email", "email")}
          <button class="button-primary" type="submit">Send link</button>
        </form>
        <p class="info-note">This is a demo store, so no email is sent.</p>`;
    }
    return `<div class="info-inner">${infoBack()}${body}</div>`;
  }

  function openInfo(key) {
    if (!state.infoOpen) infoFocus = document.activeElement;
    infoEl.innerHTML = infoPage(key);
    infoEl.dataset.key = key;
    state.infoOpen = true;
    infoEl.classList.add("is-open");
    infoEl.removeAttribute("inert"); infoEl.setAttribute("aria-hidden", "false");
    pageEl.setAttribute("inert", "");
    infoEl.scrollTop = 0;
    document.title = `${INFO_TITLES[key]} — ALTÉ`;
    $(".info-title", infoEl).focus({ preventScroll: true });
  }
  function closeInfo() {
    if (!state.infoOpen) return;
    state.infoOpen = false;
    infoEl.classList.remove("is-open");
    infoEl.setAttribute("inert", ""); infoEl.setAttribute("aria-hidden", "true");
    pageEl.removeAttribute("inert");
    document.title = BASE_TITLE;
    if (infoFocus && document.contains(infoFocus)) infoFocus.focus({ preventScroll: true });
  }

  // Üyelik ve giriş formları demodur: doğrulanır, hiçbir yere gönderilmez ya da saklanmaz
  infoEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target, key = form.dataset.infoForm;
    let first = null;
    (key === "join" ? ["firstName", "email"] : ["email"]).forEach((n) => {
      const input = form.elements[n], err = form.querySelector(`[data-err="${n}"]`);
      const res = RULES[n](input.value.trim());
      err.hidden = res === true;
      err.textContent = res === true ? "" : res;
      if (res === true) input.removeAttribute("aria-invalid");
      else { input.setAttribute("aria-invalid", "true"); if (!first) first = input; }
    });
    if (first) { first.focus(); return; }
    const val = (n) => esc(form.elements[n].value.trim());
    const join = key === "join";
    infoEl.innerHTML = `<div class="info-inner">${infoBack()}
      <h1 class="info-title" tabindex="-1">${join ? "Welcome." : "Link sent."}</h1>
      <p class="info-lead">${join ? `Thanks, ${val("firstName")}. Your membership is ready.` : `We would email a sign-in link to ${val("email")}.`}</p>
      <p class="info-note">${join ? "This is a demo store. No account was created and nothing was saved." : "This is a demo store, so no email was sent."}</p>
      <a class="button-primary co-btn" href="#">Continue shopping</a></div>`;
    $(".info-title", infoEl).focus({ preventScroll: true });
  });

  /* ---------- Menu ---------- */
  const menuEl = $("[data-menu]");
  const menuBtn = $("[data-menu-btn]");
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  function setNav(key) {
    navLinks.forEach((a) => {
      const on = a.dataset.nav === key && !a.classList.contains("logo");
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }
  function openMenu() {
    menuEl.classList.add("is-open"); scrim.classList.add("is-open");
    menuEl.removeAttribute("inert"); menuEl.setAttribute("aria-hidden", "false");
    state.menuOpen = true;
    updateLock();
    setTimeout(() => $("[data-menu-close]").focus({ preventScroll: true }), 50);
  }
  function closeMenu() {
    if (!state.menuOpen) return;
    menuEl.classList.remove("is-open"); scrim.classList.remove("is-open");
    menuEl.setAttribute("inert", ""); menuEl.setAttribute("aria-hidden", "true");
    state.menuOpen = false;
    updateLock();
  }
  // Üst / Alt giyim alt başlıkları yukarıdan aşağı açılır (yükseklik geçişi); kapalıyken odaklanılamaz
  function setGroup(g, open) {
    const sub = $(".nav-sub", g);
    g.classList.toggle("is-open", open);
    $(".nav-group-btn", g).setAttribute("aria-expanded", String(open));
    sub.toggleAttribute("inert", !open);
  }

  /* Menüyü parmakla aç ve kapat: sol kenardan sağa çekince parmağı izleyerek açılır, açıkken sola itince kapanır.
     Bırakınca yolun %30'undan fazlası gidilmişse ya da hızlı çekilmişse o yöne tamamlanır. */
  const EDGE_PX = 28;
  let mdrag = null;
  function menuSettle(open) {
    menuEl.classList.remove("is-dragging"); scrim.classList.remove("is-dragging");   // geçişler geri gelir
    void menuEl.offsetWidth;
    if (open) { if (!state.menuOpen) openMenu(); } else closeMenu();
    menuEl.style.transform = ""; scrim.style.opacity = "";
  }
  document.addEventListener("touchstart", (e) => {
    mdrag = null;
    if (!navMq.matches || e.touches.length !== 1 || peek) return;
    const t = e.touches[0];
    const base = { x: t.clientX, y: t.clientY, axis: null, pos: 0, t: performance.now() };
    if (state.menuOpen) { if (menuEl.contains(e.target) || e.target === scrim) mdrag = { ...base, mode: "close" }; }
    else if (t.clientX <= EDGE_PX && !wasLocked && state.mode === "ring") mdrag = { ...base, mode: "open" };
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!mdrag) return;
    const t = e.touches[0], dx = t.clientX - mdrag.x, dy = t.clientY - mdrag.y;
    if (!mdrag.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      const right = mdrag.mode === "open" ? dx > 0 : dx < 0;
      if (!right || Math.abs(dx) < Math.abs(dy) * 1.2) { mdrag = null; return; }      // dikey kaydırma menü listesinindir
      mdrag.axis = "h";
      menuEl.classList.add("is-dragging"); scrim.classList.add("is-dragging");
    }
    const w = menuEl.offsetWidth;
    mdrag.pos = Math.max(0, Math.min(w, mdrag.mode === "open" ? dx : w + dx));
    mdrag.v = dx / Math.max(1, performance.now() - mdrag.t);
    menuEl.style.transform = `translateX(${mdrag.pos - w}px)`;
    scrim.style.opacity = String(mdrag.pos / w);
  }, { passive: true });
  const menuDragEnd = () => {
    const d = mdrag; mdrag = null;
    if (!d || d.axis !== "h") return;
    const frac = d.pos / menuEl.offsetWidth;
    menuSettle(d.mode === "open" ? frac > 0.3 || d.v > 0.5 : !(frac < 0.7 || d.v < -0.5));
  };
  document.addEventListener("touchend", menuDragEnd, { passive: true });
  document.addEventListener("touchcancel", menuDragEnd, { passive: true });

  menuBtn.addEventListener("click", openMenu);
  $("[data-menu-close]").addEventListener("click", () => { closeMenu(); menuBtn.focus({ preventScroll: true }); });
  menuEl.addEventListener("click", (e) => {
    const group = e.target.closest(".nav-group-btn");
    if (group) {                                 // Üst giyim / Alt giyim: alt başlıkları açar ve kapatır
      setGroup(group.parentElement, group.getAttribute("aria-expanded") !== "true");
      return;
    }
    const a = e.target.closest("a");
    if (!a) return;
    if (navMq.matches && a.dataset.mCat) { e.preventDefault(); goMobileCatalog(a.dataset.mCat, a.dataset.mSub || "all"); }
    else if (navMq.matches && a.dataset.nav === "looks") setMobileView("showroom");
    closeMenu();
  });
  // alt başlık bağlantıları: "Tümü" + türler
  menuEl.querySelectorAll("[data-sub-list]").forEach((box) => {
    const g = box.dataset.subList;
    box.innerHTML = "<div>" + [["all", g === "tops" ? "All tops" : "All bottoms"], ...KINDS[g]]
      .map(([id, label]) => `<a href="#/shop/${g}" data-m-cat="${g}" data-m-sub="${id}">${label}</a>`).join("") + "</div>";
  });

  /* ---------- Checkout ---------- */
  // Demo ödeme: kart bilgisi yalnızca tarayıcıda doğrulanır, hiçbir yere gönderilmez ya da saklanmaz.
  const coEl = $("[data-co]");
  const FREE_SHIP = 150, SHIP_STD = 8, SHIP_EXP = 18;
  const ETA = { standard: "3 to 5 business days", express: "1 to 2 business days" };
  const COUNTRIES = ["United States", "United Kingdom", "Canada", "Germany", "France", "Türkiye"];
  let coCtx = { method: "standard", placing: false };
  let coFocus = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function coTotals(method) {
    const lines = cartLines();
    const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
    const saving = bundleSavings();
    const net = subtotal - saving;
    const ship = method === "express" ? SHIP_EXP : net >= FREE_SHIP ? 0 : SHIP_STD;
    return { lines, subtotal, saving, net, ship, total: net + ship };
  }

  const required = (msg) => (v) => v ? true : msg;
  const RULES = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email address.",
    firstName: required("Enter your first name."),
    lastName: required("Enter your last name."),
    address: required("Enter your street address."),
    city: required("Enter your city."),
    region: required("Enter your state or region."),
    postcode: (v) => v.length >= 3 || "Enter a postal code.",
    phone: (v) => !v || v.replace(/\D/g, "").length >= 7 || "Enter a valid phone number.",
    cardNumber: (v) => { const n = v.replace(/\D/g, ""); return (n.length >= 13 && n.length <= 19) || "Enter a valid card number."; },
    cardName: required("Enter the name on your card."),
    expiry: (v) => {
      const m = /^(\d{2})\/(\d{2})$/.exec(v);
      if (!m) return "Use the format MM/YY.";
      const mo = Number(m[1]), yr = 2000 + Number(m[2]), now = new Date();
      if (mo < 1 || mo > 12) return "Enter a valid month.";
      if (yr < now.getFullYear() || (yr === now.getFullYear() && mo < now.getMonth() + 1)) return "This card has expired.";
      return true;
    },
    cvc: (v) => /^\d{3,4}$/.test(v) || "Enter the 3 or 4 digit code."
  };

  const fieldHTML = (id, label, o = {}) => `
    <div class="field${o.wide ? " is-wide" : ""}">
      <label for="co-${id}">${label}${o.optional ? " <span>(optional)</span>" : ""}</label>
      <input id="co-${id}" name="${id}" type="${o.type || "text"}" autocomplete="${o.ac || "off"}"${o.mode ? ` inputmode="${o.mode}"` : ""}${o.ph ? ` placeholder="${o.ph}"` : ""} aria-describedby="err-${id}">
      <p class="field-error" id="err-${id}" hidden></p>
    </div>`;

  const coLine = ({ look, item, qty, size }) => `
    <li class="co-line">
      <div class="piece-thumb co-thumb" style="${thumbStyle(look, item.crop)}"><span class="co-qty" aria-label="Quantity ${qty}">${qty}</span></div>
      <div>
        <p class="piece-name">${item.name}</p>
        <p class="piece-meta">${item.color}${sizeNote(size) ? `, ${size}` : ""}</p>
      </div>
      <p class="bag-item-price">${money(item.price * qty)}</p>
    </li>`;

  function renderCheckout() {
    coCtx = { method: "standard", placing: false };
    if (!cartLines().length) {
      coEl.innerHTML = `
        <div class="co-inner co-empty">
          <h1 class="co-title" tabindex="-1">Your bag is empty</h1>
          <p>Open a look, pick a piece and add it to your bag. It will show up here.</p>
          <a class="button-primary co-btn" href="#">Back to looks</a>
        </div>`;
      return;
    }
    coEl.innerHTML = `
      <div class="co-inner">
        <a class="pdp-back" href="#">${arrowLeft} Back to shopping</a>
        <h1 class="co-title" tabindex="-1">Checkout</h1>
        <div class="co-grid">
          <form class="co-form" data-co-form novalidate>
            <section class="co-section" aria-labelledby="co-h-contact">
              <h2 id="co-h-contact">Contact</h2>
              <div class="co-fields">${fieldHTML("email", "Email", { type: "email", ac: "email", wide: true })}</div>
            </section>

            <section class="co-section" aria-labelledby="co-h-delivery">
              <h2 id="co-h-delivery">Delivery address</h2>
              <div class="co-fields">
                ${fieldHTML("firstName", "First name", { ac: "given-name" })}
                ${fieldHTML("lastName", "Last name", { ac: "family-name" })}
                ${fieldHTML("address", "Street address", { ac: "address-line1", wide: true })}
                ${fieldHTML("address2", "Apartment, suite, unit", { ac: "address-line2", wide: true, optional: true })}
                ${fieldHTML("city", "City", { ac: "address-level2" })}
                ${fieldHTML("region", "State or region", { ac: "address-level1" })}
                ${fieldHTML("postcode", "Postal code", { ac: "postal-code" })}
                <div class="field">
                  <label for="co-country">Country</label>
                  <select id="co-country" name="country" autocomplete="country-name">${COUNTRIES.map((c) => `<option${c === (lang === "tr" ? "Türkiye" : "United States") ? " selected" : ""}>${c}</option>`).join("")}</select>
                </div>
                ${fieldHTML("phone", "Phone", { type: "tel", ac: "tel", mode: "tel", wide: true, optional: true })}
              </div>
            </section>

            <section class="co-section" aria-labelledby="co-h-ship">
              <h2 id="co-h-ship">Shipping method</h2>
              <div role="radiogroup" aria-labelledby="co-h-ship">
                <label class="ship-opt">
                  <input type="radio" name="ship" value="standard" checked>
                  <span class="ship-name">Standard</span><span class="ship-eta">${ETA.standard}</span>
                  <span class="ship-price" data-ship-price="standard"></span>
                </label>
                <label class="ship-opt">
                  <input type="radio" name="ship" value="express">
                  <span class="ship-name">Express</span><span class="ship-eta">${ETA.express}</span>
                  <span class="ship-price" data-ship-price="express"></span>
                </label>
              </div>
            </section>

            <section class="co-section" aria-labelledby="co-h-pay">
              <h2 id="co-h-pay">Payment</h2>
              <p class="co-demo">This is a demo store. Card details stay in your browser and no payment is taken.</p>
              <div class="co-fields">
                ${fieldHTML("cardNumber", "Card number", { ac: "cc-number", mode: "numeric", ph: "1234 5678 9012 3456", wide: true })}
                ${fieldHTML("cardName", "Name on card", { ac: "cc-name", wide: true })}
                ${fieldHTML("expiry", "Expiry", { ac: "cc-exp", mode: "numeric", ph: "MM/YY" })}
                ${fieldHTML("cvc", "Security code", { ac: "cc-csc", mode: "numeric", ph: "123" })}
              </div>
            </section>

            <button class="button-primary" type="submit" data-co-submit>Place order</button>
          </form>

          <aside class="co-summary" data-co-summary>
            <button class="co-summary-toggle" type="button" data-co-toggle aria-expanded="false">
              <span>Order summary</span><span data-co-toggle-total></span>
            </button>
            <h2 class="co-summary-title">Order summary</h2>
            <div class="co-summary-body" data-co-body></div>
          </aside>
        </div>
      </div>`;
    renderCoSummary();
  }

  function renderCoSummary() {
    const t = coTotals(coCtx.method);
    const std = coTotals("standard");
    const need = FREE_SHIP - t.net;
    $("[data-co-body]", coEl).innerHTML = `
      <ul class="co-lines">${t.lines.map(coLine).join("")}</ul>
      <dl class="bag-totals">
        <div><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd></div>
        ${t.saving > 0 ? `<div class="is-saving"><dt>Look bundle savings</dt><dd>-${money(t.saving)}</dd></div>` : ""}
        <div><dt>Shipping</dt><dd>${t.ship ? money(t.ship) : "Free"}</dd></div>
        <div class="is-total"><dt>Total</dt><dd>${money(t.total)}</dd></div>
      </dl>
      ${coCtx.method === "standard" && need > 0 ? `<p class="co-hint">Add ${money(need)} more to get free standard shipping.</p>` : ""}`;
    $("[data-co-toggle-total]", coEl).textContent = money(t.total);
    $('[data-ship-price="standard"]', coEl).textContent = std.ship ? money(std.ship) : "Free";
    $('[data-ship-price="express"]', coEl).textContent = money(SHIP_EXP);
  }

  // Sepet checkout açıkken değişirse (ör. sepet çekmecesinden) özet güncellenir; formdaki yazılanlar korunur
  function refreshCheckout() {
    if (!cartLines().length) { renderCheckout(); return; }
    if ($("[data-co-body]", coEl)) renderCoSummary(); else renderCheckout();
  }

  function setFieldError(form, name, msg) {
    const input = form.elements[name];
    const err = $(`#err-${name}`, form);
    if (!input || !err) return;
    err.hidden = !msg;
    err.textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }

  function validateCheckout(form) {
    let first = null;
    Object.keys(RULES).forEach((name) => {
      const input = form.elements[name];
      if (!input) return;
      const res = RULES[name](input.value.trim());
      setFieldError(form, name, res === true ? "" : res);
      if (res !== true && !first) first = input;
    });
    return first;
  }

  function placeOrder(form) {
    const bad = validateCheckout(form);
    if (bad) { bad.focus(); return; }
    if (coCtx.placing) return;
    coCtx.placing = true;
    const btn = $("[data-co-submit]", coEl);
    btn.disabled = true; btn.textContent = "Placing order";
    const data = Object.fromEntries(new FormData(form));
    const t = coTotals(coCtx.method);
    const method = coCtx.method;
    setTimeout(() => {
      const order = "LB-" + String(Math.floor(100000 + Math.random() * 900000));
      cart = {}; saveCart(); updateBagCount(false); syncPieceButtons();
      showConfirmation({ data, t, method, order });
    }, 900);
  }

  function showConfirmation({ data, t, method, order }) {
    coEl.innerHTML = `
      <div class="co-inner co-done">
        <h1 class="co-done-title" tabindex="-1">Order confirmed.</h1>
        <p class="co-done-lead">Thanks, ${esc(data.firstName)}. Order <b>${order}</b> is on its way to being packed.</p>
        <div class="co-done-grid">
          <div>
            <h2>Delivery</h2>
            <p>${esc(data.firstName)} ${esc(data.lastName)}<br>${esc(data.address)}${data.address2 ? `, ${esc(data.address2)}` : ""}<br>${esc(data.city)}, ${esc(data.region)} ${esc(data.postcode)}<br>${esc(data.country)}</p>
            <p class="co-hint">${method === "express" ? "Express" : "Standard"} shipping, ${ETA[method]}.</p>
          </div>
          <div class="co-summary">
            <h2 class="co-summary-title">Your order</h2>
            <ul class="co-lines">${t.lines.map(coLine).join("")}</ul>
            <dl class="bag-totals">
              <div><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd></div>
              ${t.saving > 0 ? `<div class="is-saving"><dt>Look bundle savings</dt><dd>-${money(t.saving)}</dd></div>` : ""}
              <div><dt>Shipping</dt><dd>${t.ship ? money(t.ship) : "Free"}</dd></div>
              <div class="is-total"><dt>Total</dt><dd>${money(t.total)}</dd></div>
            </dl>
          </div>
        </div>
        <p class="co-demo">This is a demo store. No payment was taken and no confirmation email is sent.</p>
        <a class="button-primary co-btn" href="#">Continue shopping</a>
      </div>`;
    coEl.scrollTop = 0;
    $(".co-done-title", coEl).focus({ preventScroll: true });
  }

  function openCheckout() {
    if (!state.coOpen) coFocus = document.activeElement;
    renderCheckout();
    state.coOpen = true;
    coEl.classList.add("is-open");
    coEl.removeAttribute("inert"); coEl.setAttribute("aria-hidden", "false");
    pageEl.setAttribute("inert", "");
    coEl.scrollTop = 0;
    document.title = "Checkout — ALTÉ";
    $(".co-title", coEl).focus({ preventScroll: true });
  }

  function closeCheckout() {
    if (!state.coOpen) return;
    state.coOpen = false;
    coEl.classList.remove("is-open");
    coEl.setAttribute("inert", ""); coEl.setAttribute("aria-hidden", "true");
    pageEl.removeAttribute("inert");
    document.title = BASE_TITLE;
    if (coFocus && document.contains(coFocus)) coFocus.focus({ preventScroll: true });
  }

  coEl.addEventListener("submit", (e) => { e.preventDefault(); placeOrder(e.target); });
  coEl.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.name) return;
    // kart alanlarını yazarken biçimlendir
    if (el.name === "cardNumber") el.value = el.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
    if (el.name === "expiry") {
      const d = el.value.replace(/\D/g, "").slice(0, 4);
      el.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    }
    if (el.name === "cvc") el.value = el.value.replace(/\D/g, "").slice(0, 4);
    if (el.getAttribute("aria-invalid")) setFieldError(el.form, el.name, "");
  });
  coEl.addEventListener("change", (e) => {
    if (e.target.name === "ship") { coCtx.method = e.target.value; renderCoSummary(); }
  });
  coEl.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-co-toggle]");
    if (!toggle) return;
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", open);
    toggle.closest(".co-summary").classList.toggle("is-open", open);
  });

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2400);
  }

  /* ---------- Keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea") || guideEl.open) return;
    if (state.menuOpen) { if (e.key === "Escape") { closeMenu(); menuBtn.focus({ preventScroll: true }); } return; }
    if (state.bagOpen) { if (e.key === "Escape") closeBag(); return; }
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); focusSearch(); return; }
    // klavyeyle de aynı "sayfa gibi" geçiş: aşağı ok / PageDown ürün alanına, yukarı ok / PageUp showroom'a
    if (pageScrollOn() && !snapping) {
      const y = scrollY, cy = catalogStartY();
      if ((e.key === "ArrowDown" || e.key === "PageDown") && y < cy - 2) { e.preventDefault(); snapTo(cy); return; }
      if ((e.key === "ArrowUp" || e.key === "PageUp") && y > 0 && y <= cy + 2) { e.preventDefault(); snapTo(0); return; }
    }
    if (state.pdpOpen) { if (e.key === "Escape") location.hash = cameFromShop ? shopHash(cameFromShop) : `#/look/${pdpCtx.look.id}`; return; }
    if (state.shopOpen && shopEl.classList.contains("is-filters-open")) {
      if (e.key === "Escape") { shopEl.classList.remove("is-filters-open"); syncFilterToggle(); }
      return;
    }
    if (state.coOpen || state.shopOpen || state.infoOpen) { if (e.key === "Escape") location.hash = ""; return; }
    if (state.mode === "detail") {
      if (e.key === "Escape") closeDetail();
      return;
    }
    if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
    else if ((e.key === "Enter" || e.key === " ") && (e.target === document.body || e.target === stage)) { openDetail(); e.preventDefault(); }
  });
  stage.tabIndex = 0;

  /* ---------- Theme ---------- */
  const THEME_KEY = "lobby-theme";
  const themeBtn = $("[data-theme-btn]");
  const themeMeta = $('meta[name="theme-color"]');
  const rootEl = document.documentElement;
  function applyTheme(theme, animate) {
    if (animate && !reduceMotion) {
      rootEl.classList.add("theme-anim");
      setTimeout(() => rootEl.classList.remove("theme-anim"), 450);
    }
    rootEl.dataset.theme = theme;
    themeMeta.setAttribute("content", theme === "dark" ? "#111111" : "#ffffff");
    themeBtn.setAttribute("aria-pressed", theme === "dark");
  }
  applyTheme(rootEl.dataset.theme === "dark" ? "dark" : "light", false);
  themeBtn.addEventListener("click", () => {
    const next = rootEl.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next, true);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  });
  // kullanıcı bir tercih yapmadıysa sistem temasını izle
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch {}
    if (!saved) applyTheme(e.matches ? "dark" : "light", true);
  });

  /* ---------- Language switch ---------- */
  function setPromo() {
    $("[data-promo]").textContent = `Free shipping over ${moneyShort(FREE_SHIP)}`;
  }
  function updateLangButtons() {
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === lang));
  }
  // Para birimi değişince tutar gösteren ekranlar yeniden çizilir (seçimler korunur)
  function refreshMoney() {
    setPromo();
    renderCatalog();
    renderRecent();
    if (state.infoOpen && infoEl.dataset.key === "help") infoEl.innerHTML = infoPage("help");
    if (!suggestEl.hidden) renderSuggest();
    renderBag();
    if (state.mode === "detail") fillPanel(LOOKS[frontIndex()]);
    if (state.pdpOpen && pdpCtx) {
      const { look, k, size } = pdpCtx;
      renderPdp(look, k);
      const chip = size && pdpEl.querySelector(`[data-size-opt="${size}"]`);
      if (chip) chip.click();
    }
    if (state.shopOpen) {
      const scroll = shopEl.scrollTop, filtersOpen = shopEl.classList.contains("is-filters-open");
      renderShop();
      shopEl.scrollTop = scroll;
      if (filtersOpen) { shopEl.classList.add("is-filters-open"); syncFilterToggle(); }
    }
    if (state.coOpen && $("[data-co-body]", coEl)) renderCoSummary();
  }
  function setLang(next) {
    if (next === lang || !CURRENCY[next]) return;
    lang = next;
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
    updateLangButtons();
    refreshMoney();
    I18N.setLang(lang);
  }
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  // Logo: her yerden ana sayfaya (showroom) döner; açık look paneli de kapanır
  document.querySelectorAll(".logo").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    if (!navMq.matches) scrollTop(); else setMobileView("showroom");
    if (location.hash) location.hash = ""; else route();
  }));

  addEventListener("resize", measure);
  measure();
  requestAnimationFrame(tick);
  route();                                // sayfa doğrudan #/p/.. adresiyle açıldıysa ürün sayfasını göster
  setPromo();
  renderCatalog();
  renderRecent();
  syncFavs();
  syncNavSpy();
  syncMobileNav();
  updateLangButtons();
  I18N.setLang(lang);                     // kayıtlı ya da tarayıcı diline göre ilk çeviri

  // Yazı tipi ve öndeki looklar hazır olunca (en geç 2 sn sonra) açılış başlar; böylece boş sahne ya da görsel pop-in görünmez
  const imgs = lookEls.map((el) => el.querySelector("img"));
  const priority = [0, 1, 2, N - 2, N - 1].map((i) => imgs[i].decode().catch(() => {}));
  Promise.race([
    Promise.all([document.fonts ? document.fonts.ready : null, ...priority]),
    new Promise((r) => setTimeout(r, 2000))
  ]).then(() => {
    measure();
    showroom.classList.add("is-ready");
    if (state.intro < 0) state.intro = 0;
  });
})();
