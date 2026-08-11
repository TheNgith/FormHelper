#!/usr/bin/env bash
#
# Rebuilds the Tinos web fonts in public/fonts/.
#
# Tinos is metric-compatible with Times New Roman and covers Vietnamese in full.
# The upstream files are ~570 KB each because they also carry Greek, Cyrillic and
# a lot of symbols we never print, so we subset them down to Latin + Vietnamese.
# That takes the four faces from ~2.2 MB to a few hundred KB total, which matters
# because the fonts are fetched on a phone before the PDF can be generated.
#
# Requires pyftsubset (pip install fonttools brotli).
# Run from the repo root:  ./scripts/build-fonts.sh

set -euo pipefail

DEST="public/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

UPSTREAM="https://raw.githubusercontent.com/google/fonts/main/ofl/tinos"
LICENSE_URL="https://raw.githubusercontent.com/googlefonts/tinos/main/OFL.txt"

# Basic Latin + Latin-1 + Latin Extended-A/B (Đ đ Ơ ơ Ư ư live here),
# combining marks so decomposed (NFD) input still renders, Latin Extended
# Additional (every precomposed Vietnamese letter), punctuation and ₫.
UNICODES="U+0020-007E,U+00A0-00FF,U+0100-024F,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20AB,U+2122"

mkdir -p "$DEST"

for FACE in Regular Bold Italic BoldItalic; do
  echo "==> Tinos-$FACE"
  curl -sfL -o "$WORK/Tinos-$FACE.ttf" "$UPSTREAM/Tinos-$FACE.ttf"
  pyftsubset "$WORK/Tinos-$FACE.ttf" \
    --output-file="$DEST/Tinos-$FACE.ttf" \
    --unicodes="$UNICODES" \
    --layout-features='*' \
    --no-hinting \
    --desubroutinize
  printf '    %s -> %s\n' \
    "$(du -h "$WORK/Tinos-$FACE.ttf" | cut -f1)" \
    "$(du -h "$DEST/Tinos-$FACE.ttf" | cut -f1)"
done

# The OFL requires the licence to travel with the fonts.
curl -sfL -o "$DEST/OFL.txt" "$LICENSE_URL"

echo "Done. Subset fonts written to $DEST/"
