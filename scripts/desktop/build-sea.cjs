'use strict';
/**
 * Prepara o SEA (Single Executable Application) do Consentra Desktop:
 *   1. Empacota o conteúdo de `out/` em `scripts/desktop/embedded-assets.cjs`
 *      (mapa "caminho/relativo" -> base64)
 *   2. Faz o bundle de `server.js` (+ mapa embutido) com esbuild → .desktop-build/build/sea-main.cjs
 *   3. Gera o blob SEA com o Node.js v24.19.0 (manylinux) — MESMA versão do
 *      runtime Windows que será injetado depois (blob/runtime casados por versão)
 *
 * Requer: node >= 20 no PATH (para o esbuild JS) e os wheels do
 * nodejs-wheel-binaries em scripts/desktop/.cache/ (baixados pelo build-desktop.sh).
 * Saída: .desktop-build/build/sea-prep.blob
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'out');
const BUILD_DIR = path.join(ROOT, '.desktop-build', 'build');
const EMBEDDED_PATH = path.join(ROOT, 'scripts', 'desktop', 'embedded-assets.cjs');
const LINUX_NODE = process.env.CONSENTRA_LINUX_NODE || path.join(ROOT, 'scripts', 'desktop', '.cache', 'node-linux-24', 'bin', 'node');

function fail(msg) {
  console.error(`ERRO (build-sea): ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
  fail(`${OUT_DIR} não existe ou não contém index.html — rode o build do Next.js primeiro.`);
}

fs.mkdirSync(BUILD_DIR, { recursive: true });

/* ------------------------------------------------- 1. mapa embutido ----- */
const files = {};
let total = 0;
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = path.relative(OUT_DIR, abs).split(path.sep).join('/');
    // .nojekyll não é usado pelo servidor local
    if (rel === '.nojekyll') continue;
    const buf = fs.readFileSync(abs);
    files[rel] = buf.toString('base64');
    total += buf.length;
  }
})(OUT_DIR);

const count = Object.keys(files).length;
const header = '// GERADO AUTOMATICAMENTE por scripts/desktop/build-sea.cjs — NÃO EDITE.\n';
fs.writeFileSync(EMBEDDED_PATH, `${header}module.exports = { files: ${JSON.stringify(files)} };\n`);
console.log(`embedded-assets.cjs: ${count} arquivos, ${(total / 1e6).toFixed(2)} MB`);

/* --------------------------------------------------------- 2. bundle --- */
const esbuild = require(require.resolve('esbuild', { paths: [path.join(ROOT, '.desktop-build')] }));
esbuild.buildSync({
  entryPoints: [path.join(ROOT, 'scripts', 'desktop', 'server.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  outfile: path.join(BUILD_DIR, 'sea-main.cjs'),
  logLevel: 'warning',
  legalComments: 'none',
  minify: false,
});
console.log('bundle: .desktop-build/build/sea-main.cjs');

/* --------------------------------------------------- 3. blob SEA --------- */
if (!fs.existsSync(LINUX_NODE)) {
  fail(`Node Linux de referência não encontrado em ${LINUX_NODE} (build-desktop.sh baixa o wheel muitaslinux).`);
}
const seaConfigPath = path.join(BUILD_DIR, 'sea-config.json');
fs.writeFileSync(
  seaConfigPath,
  JSON.stringify(
    {
      main: path.join(BUILD_DIR, 'sea-main.cjs'),
      output: path.join(BUILD_DIR, 'sea-prep.blob'),
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
      useCodeCache: false,
    },
    null,
    2,
  ),
);
execFileSync(LINUX_NODE, ['--version'], { stdio: 'inherit' });
execFileSync(LINUX_NODE, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' });
console.log('blob SEA gerado: .desktop-build/build/sea-prep.blob');
