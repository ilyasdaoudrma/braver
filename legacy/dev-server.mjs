// Serveur local pour la démo hors Vercel : `npm run dev` puis http://localhost:3000
// Sert les fichiers statiques et exécute les mêmes fonctions que /api sur Vercel.
// La clé peut être mise dans un fichier .env.local : ANTHROPIC_API_KEY=...
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

for (const file of [".env.local", ".env"]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};
const BLOCKED = /^\/(node_modules|api|\.env|\.git|server\.mjs|package)/;

function wrapRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

async function handleApi(req, res, name) {
  const file = path.join(root, "api", `${name}.js`);
  if (!/^[a-z]+$/.test(name) || !fs.existsSync(file)) return wrapRes(res).status(404).json({ error: "not_found" });
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    req.body = raw ? JSON.parse(raw) : {};
  } catch {
    req.body = {};
  }
  const mod = await import(pathToFileURL(file).href);
  await mod.default(req, wrapRes(res));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const api = url.pathname.match(/^\/api\/([^/]+)\/?$/);
    if (api) return await handleApi(req, res, api[1]);
    if (BLOCKED.test(url.pathname)) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) {
      res.statusCode = 403;
      return res.end();
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("Erreur serveur");
  }
});

server.listen(PORT, () => {
  const ai = process.env.ANTHROPIC_API_KEY ? "IA activée" : "pas de clé : règles locales";
  console.log(`BRAVER sur http://localhost:${PORT}  (${ai})`);
});
