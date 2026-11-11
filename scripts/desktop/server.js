'use strict';
/**
 * Consentra Desktop — servidor local do site estático (export `out/`).
 *
 * Este servidor roda embutido no Consentra.exe (Node.js SEA). Em modo SEA, os
 * arquivos do site vêm do mapa embutido `embedded-assets.cjs` (gerado no
 * build); em modo "solto" (`node scripts/desktop/server.js`), eles vêm da
 * pasta `out/` ao lado deste arquivo.
 *
 * Escuta SOMENTE em 127.0.0.1 (loopback) — o app e seus dados nunca são
 * expostos na rede. Sem dependências externas.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'out');
const BASE_PORT = Number.parseInt(process.env.CONSENTRA_PORT || '3217', 10) || 3217;
const MAX_TRIES = 25;
const LOG_FILE = path.join(os.tmpdir(), 'consentra-desktop.log');

/* Mapa embutido: "caminho/relativo/do/arquivo" -> base64. Nulo fora do SEA. */
const EMBEDDED = (() => {
  try {
    const mod = require('./embedded-assets.cjs');
    if (mod && mod.files && typeof mod.files === 'object') return mod.files;
    return null;
  } catch {
    return null;
  }
})();

function log(msg) {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    /* log é best-effort */
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.zip': 'application/zip',
};

/** Existe (arquivo de site) no modo embutido ou no disco? */
function hasRel(rel) {
  if (EMBEDDED) return Object.prototype.hasOwnProperty.call(EMBEDDED, rel);
  try {
    return fs.statSync(path.join(OUT_DIR, rel)).isFile();
  } catch {
    return false;
  }
}

/** Lê o conteúdo (Buffer) de um arquivo do site. */
function readRel(rel) {
  if (EMBEDDED) return Buffer.from(EMBEDDED[rel], 'base64');
  return fs.readFileSync(path.join(OUT_DIR, rel));
}

/** Mapeia a URL para um arquivo do site (ou null). */
function resolveRel(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const normalized = path.posix.normalize(decoded.replace(/\\/g, '/'));
  if (normalized.includes('..')) return null;

  const rel = normalized.replace(/^\/+/, '');
  if (rel === '') return { rel: 'index.html', redirect: false };

  // Arquivo exato (ex.: _next/static/..., favicon.ico, api/version)
  if (hasRel(rel)) return { rel, redirect: false };

  // Diretório (export com trailingSlash): <rota>/index.html
  if (hasRel(`${rel}/index.html`)) {
    return { rel: `${rel}/index.html`, redirect: !decoded.endsWith('/') };
  }

  // Caminho sem extensão aponta para <rota>/index.html
  if (!path.posix.extname(rel) && hasRel(`${rel}/index.html`)) {
    return { rel: `${rel}/index.html`, redirect: true };
  }
  return null;
}

function isJsonBuffer(buf) {
  for (let i = 0; i < Math.min(buf.length, 64); i += 1) {
    const c = buf[i];
    if (c === 32 || c === 10 || c === 13 || c === 9) continue;
    return c === 0x7b /* { */ || c === 0x5b /* [ */;
  }
  return false;
}

function contentTypeFor(rel, buf) {
  const ext = path.posix.extname(rel).toLowerCase();
  if (MIME[ext]) return MIME[ext];
  if (!ext && buf && isJsonBuffer(buf)) return 'application/json; charset=utf-8';
  if (!ext) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function send(res, status, body, headers) {
  res.writeHead(status, headers);
  res.end(body);
}

function createServer(portToTry, attempt) {
  const server = http.createServer((req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return send(res, 405, 'Método não permitido', { Allow: 'GET, HEAD' });
      }
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const resolved = resolveRel(url.pathname);

      if (resolved && resolved.redirect) {
        const target = (url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`) + url.search;
        return send(res, 301, '', { Location: target, 'Cache-Control': 'no-store' });
      }

      let rel = resolved ? resolved.rel : null;
      let status = 200;
      if (!rel) {
        if (hasRel('404.html')) {
          rel = '404.html';
          status = 404;
        } else {
          return send(res, 404, 'Página não encontrada', { 'Content-Type': 'text/plain; charset=utf-8' });
        }
      }

      const buf = readRel(rel);
      const headers = {
        'Content-Type': contentTypeFor(rel, buf),
        'Content-Length': buf.length,
        'Cache-Control': rel.startsWith('_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      };
      return send(res, status, req.method === 'HEAD' ? null : buf, headers);
    } catch (err) {
      log(`erro no request: ${err && err.stack ? err.stack : err}`);
      return send(res, 500, 'Erro interno', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempt < MAX_TRIES) {
      createServer(portToTry + 1, attempt + 1);
      return;
    }
    log(`falha ao abrir porta: ${err && err.message ? err.message : err}`);
    if (attempt === 0) process.exitCode = 1;
  });

  server.listen(portToTry, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${portToTry}/`;
    log(`Consentra Desktop ouvindo em ${url} (modo: ${EMBEDDED ? 'embutido' : 'filesystem'})`);
    if (process.env.CONSENTRA_NO_BROWSER !== '1') openBrowser(url);
  });
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'win32') cmd = `start "" "${url}"`;
  else if (platform === 'darwin') cmd = `open "${url}"`;
  else cmd = `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) log(`não foi possível abrir o navegador automaticamente: ${err.message}. Acesse ${url}`);
  });
}

if (!EMBEDDED && !fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
  log(`ERRO: ${path.join(OUT_DIR, 'index.html')} não encontrado — instalação corrompida?`);
  console.error('Instalação do Consentra corrompida: conteúdo do site não encontrado.');
  process.exit(1);
}

createServer(BASE_PORT, 0);
