"""Render the bundled handwriting against its source pixels with FreeType."""

from __future__ import annotations

import base64
import io
import json
import math
from pathlib import Path

import freetype
from fontTools.ttLib import TTFont
from PIL import Image

root = Path("artifacts/paper-bloom")
project = json.loads(Path("public/samples/paper-sample.glyphsprout.json").read_text())
assert (root / "PaperBloom.ttf").stat().st_size == 3448
rendered = []
for extension in ("ttf", "woff2"):
    font = TTFont(root / f"PaperBloom.{extension}", checkChecksums=2)
    assert font["head"].unitsPerEm == 1000
    assert set(font.getBestCmap()) == {
        32,
        0xA0,
        *range(0x2002, 0x200B),
        0x202F,
        *map(ord, "HELOJB"),
    }
    assert font["name"].getDebugName(1) == "Paper Bloom"
    font.flavor = None
    output = io.BytesIO()
    font.save(output)
    face = freetype.Face(io.BytesIO(output.getvalue()))
    results = []
    for size in (288, 720, 1440):
        face.set_pixel_sizes(0, size)
        for character in project["characters"]:
            glyph = project["glyphs"][character]
            image = Image.open(
                io.BytesIO(base64.b64decode(glyph["source"].split(",")[1]))
            ).convert("L")
            assert image.size == (144, 144)
            mask = [value < glyph["settings"]["threshold"] for value in image.tobytes()]
            left = min(index % 144 for index, value in enumerate(mask) if value)
            face.load_char(
                character, freetype.FT_LOAD_RENDER | freetype.FT_LOAD_NO_HINTING
            )
            bitmap = face.glyph.bitmap
            pixels = bitmap.buffer
            assert bitmap.width > 0 and bitmap.rows > 0 and max(pixels) > 0
            for sy in range(144):
                for sx in range(144):
                    x = (sx - left + 0.5) * 1000 / 144 + 45
                    y = 780 - (sy + 0.5) * 1000 / 144
                    bx = math.floor(x * size / 1000) - face.glyph.bitmap_left
                    by = face.glyph.bitmap_top - 1 - math.floor(y * size / 1000)
                    value = (
                        pixels[by * abs(bitmap.pitch) + bx]
                        if 0 <= bx < bitmap.width and 0 <= by < bitmap.rows
                        else 0
                    )
                    assert (value > 127) == mask[sy * 144 + sx], (
                        extension,
                        size,
                        character,
                        sx,
                        sy,
                        value,
                    )
            results.append((bitmap.width, bitmap.rows, bitmap.pitch, bytes(pixels)))
    rendered.append(results)
    font.close()
assert rendered[0] == rendered[1]
print(
    "Paper Bloom passed: 6 handwriting crops, 2 formats, 3 raster sizes, 3448 byte TTF"
)
