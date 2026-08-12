#!/usr/bin/env bash
#
# Rebuilds the Libertinus web fonts in public/fonts/.
#
# The PDF is set in Libertinus. Google Fonts ships the family split across
# several projects, and only Libertinus Math is published as a standalone
# specimen — it has exactly one face, Regular, and no bold or italic at all.
# The document needs all three, so the four pdfmake slots are filled like this:
#
#   normal       LibertinusMath-Regular        the face that was asked for
#   bold         LibertinusSerif-Bold
#   italics      LibertinusSerif-Italic
#   bolditalics  LibertinusSerif-SemiBoldItalic
#
# Mixing the two projects is safe because they are one typeface underneath:
# same 1000-unit em, same 658 cap height, same 429 x-height, and 65 of the 81
# Latin and Vietnamese letters we checked are byte-identical outlines at the
# same advance width. Math only redraws a handful of glyphs it needs wider for
# formulas (J f j and the parentheses), so nothing looks spliced.
#
# The bolditalics slot is the odd one out on purpose. LibertinusSerif-BoldItalic
# is missing ơ ư Ơ Ư — four letters this form cannot do without ("Bộ môn Hóa
# Hữu Cơ", "sử dụng"). SemiBoldItalic covers Vietnamese in full, so it takes the
# slot. Nothing in the layout is bold and italic at once today; this is the
# safety net for the day something is.
#
# Coverage is Latin + Vietnamese as before, plus Greek, arrows, math operators
# and sub/superscripts. Students type chemical names into the sample table, and
# β-cyclodextrin or CaCO₃ → CaO must not come out as empty boxes.
#
# Requires pyftsubset (pip install fonttools brotli).
# Run from the repo root:  ./scripts/build-fonts.sh

set -euo pipefail

DEST="public/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

GF="https://raw.githubusercontent.com/google/fonts/main/ofl"
LICENSE_URL="https://raw.githubusercontent.com/googlefonts/libertinus/main/OFL.txt"

# Basic Latin + Latin-1 + Latin Extended-A/B (Đ đ Ơ ơ Ư ư live here),
# combining marks so decomposed (NFD) input still renders, Greek (α β γ in
# chemical names), Latin Extended Additional (every precomposed Vietnamese
# letter), punctuation, sub/superscript digits, ₫, arrows and math operators.
UNICODES="U+0020-007E,U+00A0-00FF,U+0100-024F,U+0300-036F,U+0370-03FF"
UNICODES="$UNICODES,U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20AB,U+2122"
UNICODES="$UNICODES,U+2190-21FF,U+2200-22FF"

# Each entry is "<google fonts project>/<file>".
FACES=(
  "libertinusmath/LibertinusMath-Regular.ttf"
  "libertinusserif/LibertinusSerif-Bold.ttf"
  "libertinusserif/LibertinusSerif-Italic.ttf"
  "libertinusserif/LibertinusSerif-SemiBoldItalic.ttf"
)

mkdir -p "$DEST"

for ENTRY in "${FACES[@]}"; do
  FILE="${ENTRY##*/}"
  echo "==> $FILE"
  curl -sfL -o "$WORK/$FILE" "$GF/$ENTRY"
  pyftsubset "$WORK/$FILE" \
    --output-file="$DEST/$FILE" \
    --unicodes="$UNICODES" \
    --layout-features='*' \
    --no-hinting \
    --desubroutinize
  printf '    %s -> %s\n' \
    "$(du -h "$WORK/$FILE" | cut -f1)" \
    "$(du -h "$DEST/$FILE" | cut -f1)"
done

# The OFL requires the licence to travel with the fonts.
curl -sfL -o "$DEST/OFL.txt" "$LICENSE_URL"

echo "Done. Subset fonts written to $DEST/"
