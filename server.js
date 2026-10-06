const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "shumodav";

const DATA = path.join(__dirname, "data.json");
const UPLOADS = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(DATA)) {
  fs.writeFileSync(DATA, JSON.stringify({
    news: [
      {
        id: 1,
        text: "ВНИМАНИЕ ИДЕТ РОЗЫГРЫШ КРЫШКИ ОТ ШВЕПСА",
        date: new Date().toLocaleString("ru-RU")
      },
      {
        id: 2,
        text: "ШУМОДАВ НЕ РЕКОМЕНДУЕТ ВАМ ТИШИНУ",
        date: new Date().toLocaleString("ru-RU")
      }
    ]
  }, null, 2));
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOADS));

function getData() {
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}
function saveData(data) {
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
}
function admin(req, res, next) {
  const key = req.headers["x-admin-password"] || req.body.password || req.query.password;
  if (key !== ADMIN_PASSWORD) return res.status(401).json({ error: "НЕВЕРНЫЙ ПАРОЛЬ АДМИНА" });
  next();
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Zа-яА-ЯёЁ0-9._-]/g, "_");
    cb(null, Date.now() + "_" + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /^(audio|video)\//.test(file.mimetype) ||
      /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.originalname);
    cb(ok ? null : new Error("Нужен аудиофайл"), ok);
  }
});

app.get("/api/news", (_, res) => {
  res.json(getData().news);
});

app.get("/api/tracks", (_, res) => {
  const tracks = fs.readdirSync(UPLOADS).filter(f => /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f));
  res.json(tracks.map(file => ({
    name: file.replace(/^\d+_/, ""),
    url: "/uploads/" + encodeURIComponent(file)
  })));
});

app.post("/api/news", admin, (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "НОВОСТЬ ПУСТАЯ" });
  const data = getData();
  data.news.unshift({
    id: Date.now(),
    text: text.slice(0, 500),
    date: new Date().toLocaleString("ru-RU")
  });
  saveData(data);
  res.json({ ok: true });
});

app.post("/api/upload", admin, upload.single("music"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ФАЙЛ НЕ ПРИЕХАЛ" });
  res.json({ ok: true, file: req.file.filename });
});

app.delete("/api/news/:id", admin, (req, res) => {
  const data = getData();
  data.news = data.news.filter(n => String(n.id) !== String(req.params.id));
  saveData(data);
  res.json({ ok: true });
});

app.get("/admin", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => {
  console.log("ШУМОДАВ ЗАПУЩЕН: http://localhost:" + PORT);
});