// Bağımlılıksız canlı yenilemeli geliştirme sunucusu.
// Çalıştır: node dev-server.js  ->  http://localhost:5391
// Dosya kaydedilince tarayıcı kendini yeniler; sadece CSS değiştiyse sayfa yenilenmeden stil güncellenir.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 5391;   // node dev-server.js 5392
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2"
};

const CLIENT = `<script>(() => {
  const es = new EventSource("/__live");
  es.onmessage = (e) => {
    if (e.data === "css") {
      document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
        if (l.href.startsWith(location.origin)) l.href = l.href.split("?")[0] + "?t=" + Date.now();
      });
    } else location.reload();
  };
})();</script>`;

const clients = new Set();

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  if (url === "/__live") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write("retry: 1000\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let file = path.normalize(path.join(ROOT, url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(ext === ".html" ? data.toString().replace("</body>", CLIENT + "</body>") : data);
  });
}).listen(PORT, () => console.log(`Showroom: http://localhost:${PORT}  (canlı yenileme açık)`));

let timer;
fs.watch(ROOT, { recursive: true }, (_, name) => {
  if (!name || name.startsWith(".") || name.includes("node_modules")) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const msg = name.endsWith(".css") ? "css" : "reload";
    clients.forEach((c) => c.write(`data: ${msg}\n\n`));
    console.log(`değişti: ${name} -> ${msg}`);
  }, 80);
});
