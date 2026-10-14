# GlyphSprout 1.13.0

Converting a scan now evens out the lighting in each cell before it traces the ink. Before this, a soft shadow, a darker corner or a dim phone photo could push the paper below the fixed ink threshold and turn the whole cell into solid ink. The paper level is now estimated across each cell and divided out, so evenly lit pages convert as before and shaded ones trace the strokes you drew.

The stored source image is the evened version, so the threshold slider and Edit source behave the same as on a clean scan. Strong glare and deep shadows that hide the ink still need a better photo.

Try the [live workshop](https://Arthur031221.github.io/GlyphSprout/) or follow the [user guide](https://github.com/Arthur031221/GlyphSprout/blob/main/docs/USAGE.md).
