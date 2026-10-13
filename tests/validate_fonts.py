"""Check the exported fixtures with FontTools and FreeType."""

from __future__ import annotations

import io
import json
import math
import sys
from pathlib import Path

import freetype
from fontTools.ttLib import TTFont

root = Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts/font-validation")
fixtures = json.loads((root / "expected.json").read_text())
characters = fixtures["characters"]
tables = []
for extension in ("ttf", "woff2"):
    path = root / f"fixtures.{extension}"
    font = TTFont(path, checkChecksums=2)
    assert font["head"].unitsPerEm == 1000
    assert set(font.getBestCmap()) == {32, *(ord(ch) for ch in characters)}
    assert font["maxp"].numGlyphs == len(characters) + 2
    assert font["glyf"][font.getBestCmap()[32]].numberOfContours == 0
    assert font["hmtx"][font.getBestCmap()[32]][0] == 350
    assert font["hhea"].ascent == font["OS/2"].sTypoAscender
    assert font["hhea"].descent == font["OS/2"].sTypoDescender
    for ch in characters:
        name = font.getBestCmap()[ord(ch)]
        glyph = font["glyf"][name]
        expected = fixtures["expected"][ch]
        assert [glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax] == expected["bounds"]
        assert glyph.numberOfContours == expected["contours"]
        assert font["hmtx"][name] == (expected["advance"], glyph.xMin)
        assert glyph.yMax <= font["OS/2"].usWinAscent
        assert -glyph.yMin <= font["OS/2"].usWinDescent
    assert (
        font["glyf"][font.getBestCmap()[ord("一")]].yMax
        - font["glyf"][font.getBestCmap()[ord("一")]].yMin
        == 40
    )
    assert font["glyf"][font.getBestCmap()[ord("g")]].yMin < 0
    font.flavor = None
    buffer = io.BytesIO()
    font.save(buffer)
    tables.append(buffer.getvalue())
    face = freetype.Face(io.BytesIO(buffer.getvalue()))
    for pixel_size in (100, 200, 1000):
        face.set_pixel_sizes(0, pixel_size)
        for ch in characters:
            face.load_char(ch, freetype.FT_LOAD_RENDER | freetype.FT_LOAD_NO_HINTING)
            bitmap = face.glyph.bitmap
            assert bitmap.width > 0 and bitmap.rows > 0
            pixels = bitmap.buffer
            assert max(pixels) > 0
            # Sample source-pixel centres, independently of the emitted contours.
            size = fixtures["size"]
            mask = fixtures["expected"][ch]["mask"]
            cjk = ch in "一日"
            ink_x = [i % size for i, value in enumerate(mask) if value]
            left = min(ink_x)
            for sy in range(size):
                for sx in range(size):
                    x = (sx + 0.5) * 10 if cjk else (sx - left + 0.5) * 10 + 45
                    y = 780 - (sy + 0.5) * 10
                    bx = math.floor(x * pixel_size / 1000) - face.glyph.bitmap_left
                    by = face.glyph.bitmap_top - 1 - math.floor(y * pixel_size / 1000)
                    actual = (
                        pixels[by * abs(bitmap.pitch) + bx]
                        if 0 <= bx < bitmap.width and 0 <= by < bitmap.rows
                        else 0
                    )
                    expected = mask[sy * size + sx]
                    if pixel_size == 100 and 127 <= actual <= 129:
                        continue
                    assert (actual > 127) == bool(expected), (
                        extension,
                        pixel_size,
                        ch,
                        sx,
                        sy,
                        actual,
                        expected,
                    )
    font.close()
print(
    f"FontTools and FreeType passed: {len(characters)} characters, 2 formats, 3 raster sizes"
)
