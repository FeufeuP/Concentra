#!/usr/bin/env bash
# ============================================================================
# Gera os artefatos do Consentra Desktop (Windows):
#   dist/Consentra.exe                    app autocontido (site embutido)
#   dist/Consentra-Portable-<versao>.zip  mesmo .exe + atalho "consentra.vbs" + LEIA-ME
#   dist/SHA256SUMS.txt
#
# O executável é o Node.js oficial para Windows com o site e o servidor
# local embutidos (Node SEA — Single Executable Application). Baixado do
# pacote PyPI `nodejs-wheel-binaries` e injetado localmente com `postject`.
# Nenhum binário de terceiros é versionado no repositório.
#
# Pré-requisitos (Linux): bash, node+npm ≥ 20, curl, python3, zip.
# Uso:
#   scripts/desktop/build-desktop.sh
#   CONSENTRA_VERSION=2.5.0 scripts/desktop/build-desktop.sh
#   CONSENTRA_REFRESH_NODE=1 scripts/desktop/build-desktop.sh
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

VERSION="${CONSENTRA_VERSION:-2.4.0}"
NODE_VER="24.19.0"
FUSE="NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"

CACHE="$ROOT/scripts/desktop/.cache"
LINUX_NODE_DIR="$CACHE/node-linux-24"
WIN_NODE_DIR="$CACHE/node-win-24"
DIST="$ROOT/dist"
BUILD="$ROOT/.desktop-build/build"
STAGE="$ROOT/scripts/desktop/.staging/Consentra-Portable"

echo "==> Consentra Desktop ${VERSION} — início (runtime Node.js ${NODE_VER})"

# --------------------------------------------- 1. dependências de build ----
echo "==> [1/7] Build estático do Next.js (output: export)"
GITHUB_PAGES=true npm run build

echo "==> [2/7] Ferramentas de empacotamento (postject, esbuild)"
mkdir -p "$ROOT/.desktop-build"
[ -f "$ROOT/.desktop-build/package.json" ] || echo '{"name":"consentra-desktop-build","private":true,"version":"0.0.0"}' > "$ROOT/.desktop-build/package.json"
(cd "$ROOT/.desktop-build" && npm install --no-audit --no-fund --loglevel=error postject esbuild)

# ------------------------------------------ 3. runtime Node win + linux ----
echo "==> [3/7] Runtime Node.js ${NODE_VER} (win_amd64 + manylinux para o blob)"
mkdir -p "$WIN_NODE_DIR" "$LINUX_NODE_DIR/bin" "$BUILD"
fetch_wheel() {
  local pattern="$1" dest="$2"
  if [ -f "$dest" ] && [ "${CONSENTRA_REFRESH_NODE:-0}" != "1" ]; then
    echo "    cache: $dest"
    return 0
  fi
  local url
  url="$(python3 - "$NODE_VER" "$pattern" <<'EOF'
import json, sys, urllib.request
ver, pattern = sys.argv[1], sys.argv[2]
with urllib.request.urlopen(f'https://pypi.org/pypi/nodejs-wheel-binaries/{ver}/json', timeout=60) as r:
    d = json.load(r)
for f in d['urls']:
    if pattern in f['filename']:
        print(f['url']); break
else:
    raise SystemExit(f'wheel com "{pattern}" não encontrada para {ver}')
EOF
)"
  echo "    baixando $url"
  curl -fL --retry 3 --retry-delay 2 -o "$CACHE/$(basename "$url")" "$url"
  python3 - "$CACHE/$(basename "$url")" "$dest" <<'EOF'
import os, stat, sys, zipfile
wheel, dest = sys.argv[1], sys.argv[2]
target = 'node.exe' if dest.lower().endswith('.exe') else 'node'
with zipfile.ZipFile(wheel) as z:
    cand = [(z.getinfo(n).file_size, n) for n in z.namelist() if os.path.basename(n).lower() == target]
    if not cand:
        raise SystemExit(f'{target} não encontrado no wheel')
    name = sorted(cand, reverse=True)[0][1]
    with z.open(name) as src, open(dest, 'wb') as out:
        out.write(src.read())
os.chmod(dest, 0o755)
print(f'    extraído: {name} -> {dest}')
EOF
}
fetch_wheel "-win_amd64.whl" "$WIN_NODE_DIR/Consentra.exe"
fetch_wheel "-manylinux_2_28_x86_64.whl" "$LINUX_NODE_DIR/bin/node"

python3 - "$WIN_NODE_DIR/Consentra.exe" <<'EOF'
import sys
with open(sys.argv[1], 'rb') as f:
    assert f.read(2) == b'MZ', 'runtime Windows inválido (sem assinatura MZ)'
print('    runtime Windows OK (PE válido)')
EOF

# -------------------------------------------- 4. blob + bundle SEA ----------
echo "==> [4/7] Embutindo o site e gerando o blob SEA"
node scripts/desktop/build-sea.cjs

# ----------------------------- 5. injetar blob no runtime Windows ---------
echo "==> [5/7] Injetando blob SEA no Consentra.exe (Windows)"
rm -rf "$DIST" "$STAGE"
mkdir -p "$DIST"
cp "$WIN_NODE_DIR/Consentra.exe" "$DIST/Consentra.exe"
(cd "$ROOT/.desktop-build" && npx postject "$DIST/Consentra.exe" "$FUSE" "$BUILD/sea-prep.blob" --sentinel-fuse "$FUSE" --overwrite)

# --------------------------------------------- 6. smoke test --------------
# O ELF manylinux do Node tem o sentinel duplicado (postject não resolve), então
# o smoke test executa o MESMO bundle embutido com o MESMO Node v24.19.0
# (win e linux são builds do mesmo release oficial).
echo "==> [6/7] Smoke test do bundle embutido (Node v${NODE_VER} manylinux)"
CONSENTRA_NO_BROWSER=1 CONSENTRA_PORT=3997 "$LINUX_NODE_DIR/bin/node" "$BUILD/sea-main.cjs" &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT
READY=0
for _ in $(seq 1 50); do
  if curl -fsS -o /dev/null "http://127.0.0.1:3997/" 2>/dev/null; then READY=1; break; fi
  sleep 0.2
done
[ "$READY" = "1" ] || { echo "ERRO: o servidor SEA não respondeu a tempo" >&2; exit 1; }
check() { # <path> <expected_code> [must_contain]
  local path="$1" want="$2" needle="${3:-}" body code
  if [ -z "$needle" ]; then
    code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3997${path}" || true)"
    body=""
  else
    body="$(curl -sS -w $'\n%{http_code}' "http://127.0.0.1:3997${path}" || true)"
    code="${body##*$'\n'}"
    body="${body%$'\n'*}"
  fi
  if [ "$code" != "$want" ]; then echo "ERRO: ${path} -> HTTP ${code} (esperado ${want})" >&2; exit 1; fi
  if [ -n "$needle" ] && ! grep -qi "$needle" <<<"$body"; then echo "ERRO: ${path} não contém \"${needle}\"" >&2; exit 1; fi
  echo "    OK ${path} -> ${code}"
}
check "/" 200 "consentra"
check "/api/version" 200 "commit"
check "/logo-consentra-horizontal.png" 200
check "/pagina-que-nao-existe" 404
cleanup
trap - EXIT

# ------------------------------------ 7. zip portátil + checksums ----------
echo "==> [7/7] Empacotando versão portátil e somas de verificação"
mkdir -p "$STAGE"
cp "$DIST/Consentra.exe" "$STAGE/Consentra.exe"
cp "$ROOT/scripts/desktop/consentra.vbs" "$STAGE/consentra.vbs"
cp "$ROOT/scripts/desktop/LEIA-ME-DESKTOP.txt" "$STAGE/LEIA-ME.txt"
cp "$ROOT/LICENSE" "$STAGE/LICENSE.txt"
(cd "$STAGE" && zip -qr "$DIST/Consentra-Portable-$VERSION.zip" .)

(cd "$DIST" && sha256sum "Consentra.exe" "Consentra-Portable-$VERSION.zip" > SHA256SUMS.txt)

echo
echo "==> Concluído:"
ls -lh "$DIST"
cat "$DIST/SHA256SUMS.txt"
echo
echo "    Consentra.exe é um app autocontido para Windows 64 bits (duplo clique)."
echo "    Os artefatos NÃO são versionados no git (veja .gitignore)."
