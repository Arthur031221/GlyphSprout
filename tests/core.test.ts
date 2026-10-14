import { describe, expect, it } from "vitest";
import { fontGlyph } from "../src/core/font";
import {
  homography,
  invert,
  projectPoint,
  validateCorners,
} from "../src/core/geometry";
import {
  newProject,
  parseProject,
  serializeProject,
  updateText,
  validateSettings,
} from "../src/core/project";
import {
  cellRect,
  pageCount,
  paperOrDefault,
  templateSvg,
} from "../src/core/template";
import {
  addCharacterSet,
  analyzeText,
  appendCharacters,
  CHARACTER_SETS,
  type CharacterSetId,
  charactersToAdd,
  isCjk,
  isSupported,
  missingFromSet,
} from "../src/core/text";
import { grayscale, signedArea, trace, traceMask } from "../src/core/trace";
import { defaultSettings } from "../src/core/types";

it("changes the printed sheet identity when the character order changes", () => {
  const project = newProject("My handwriting", "AB");
  const reordered = updateText(project, "BA");
  expect(reordered.id).not.toBe(project.id);
  expect(reordered.characters).toEqual(["B", "A"]);
  expect(templateSvg(project.characters, project.name, project.id, 0)).not.toBe(
    templateSvg(reordered.characters, reordered.name, reordered.id, 0),
  );
});

it.each(["é 日", "e\u0301日", "é日é日  "])(
  "retains printed sheets when text %s has the same ordered characters",
  (input) => {
    const project = newProject("My handwriting", "é日");
    const before = templateSvg(project.characters, project.name, project.id, 0);
    const updated = updateText(project, input);
    expect(updated.id).toBe(project.id);
    expect(updated.pages).toBe(project.pages);
    expect(updated.glyphs).toBe(project.glyphs);
    expect(updated.text).toBe(analyzeText(input).text);
    expect(templateSvg(updated.characters, updated.name, updated.id, 0)).toBe(
      before,
    );
  },
);

it("accepts exact 5 percent crops without accepting smaller crops", () => {
  for (const [left, right] of [
    [0.2, 0.25],
    [0.9, 0.95],
  ]) {
    const settings = defaultSettings();
    settings.crop = { left, right, top: left, bottom: right };
    expect(validateSettings(settings)).toEqual(settings);
    settings.crop.right = left + 0.0499;
    expect(() => validateSettings(settings)).toThrow("invalidProject");
  }
});

describe("pixel boundary topology", () => {
  it("conserves area for every 3 by 3 binary mask", () => {
    for (let n = 0; n < 512; n++) {
      const mask = Uint8Array.from({ length: 9 }, (_, i) => (n >> i) & 1);
      const contours = traceMask(mask, 3, 3);
      expect(contours.reduce((s, c) => s + signedArea(c), 0) * 9).toBeCloseTo(
        mask.reduce((s, p) => s + p, 0),
        8,
      );
      for (const c of contours) expect(c.length).toBeGreaterThanOrEqual(4);
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const px = (x + 0.5) / 3,
            py = (y + 0.5) / 3;
          let inside = false;
          for (const contour of contours) {
            for (
              let i = 0, j = contour.length - 1;
              i < contour.length;
              j = i++
            ) {
              const a = contour[i],
                b = contour[j];
              if (
                a.y > py !== b.y > py &&
                px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x
              )
                inside = !inside;
            }
          }
          expect(inside).toBe(Boolean(mask[y * 3 + x]));
        }
      }
    }
  });
  it("keeps diagonal islands separate and preserves counters", () => {
    expect(traceMask(new Uint8Array([1, 0, 0, 1]), 2, 2)).toHaveLength(2);
    const contours = traceMask(
      new Uint8Array([1, 1, 1, 1, 0, 1, 1, 1, 1]),
      3,
      3,
    );
    expect(contours).toHaveLength(2);
    expect(contours.map(signedArea).sort((a, b) => a - b)).toEqual([-1 / 9, 1]);
  });
  it("retains a one pixel stroke, detached dot and nested island", () => {
    const mask = new Uint8Array(81);
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 9; x++)
        if (x === 0 || y === 0 || x === 8 || y === 8 || (x === 4 && y === 4))
          mask[y * 9 + x] = 1;
    const contours = traceMask(mask, 9, 9);
    expect(contours).toHaveLength(3);
    expect(contours.reduce((s, c) => s + signedArea(c), 0) * 81).toBeCloseTo(
      33,
      8,
    );
    const gray = new Uint8Array([0, 255, 255, 255, 0, 0, 255, 255, 0]);
    expect(trace(gray, 3, 3, { threshold: 165, minArea: 1 }).inkPixels).toBe(4);
    expect(
      trace(gray, 3, 3, { threshold: 165, minArea: 2 }).removedPixels,
    ).toBe(1);
  });
  it("composites transparent dark pixels onto white", () => {
    expect([...grayscale(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 255]))]).toEqual([
      255, 0,
    ]);
  });
});

describe("registration", () => {
  it("maps skewed corners and interior points at multiple coordinate scales", () => {
    for (const scale of [1, 1000, 10000]) {
      const from = [
        { x: 0.1, y: 0.2 },
        { x: 0.9, y: 0.1 },
        { x: 0.8, y: 0.9 },
        { x: 0.2, y: 0.8 },
      ].map((p) => ({ x: p.x * scale, y: p.y * scale }));
      const to = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      validateCorners(from, scale, scale);
      const m = homography(from, to);
      from.forEach((p, i) => {
        const q = projectPoint(m, p);
        expect(q.x).toBeCloseTo(to[i].x, 8);
        expect(q.y).toBeCloseTo(to[i].y, 8);
      });
      const p = { x: 0.45 * scale, y: 0.56 * scale },
        q = projectPoint(invert(m), projectPoint(m, p));
      expect(q.x).toBeCloseTo(p.x, 7);
      expect(q.y).toBeCloseTo(p.y, 7);
    }
  });
  it("rejects crossed, collinear and tiny corner selections", () => {
    for (const p of [
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0.01, y: 0 },
        { x: 0.01, y: 0.01 },
        { x: 0, y: 0.01 },
      ],
    ])
      expect(() => validateCorners(p, 1, 1)).toThrow("invalidCorners");
    expect(() =>
      homography(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 },
        ],
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
      ),
    ).toThrow();
  });
});

describe("text, templates and source projects", () => {
  it("deduplicates normalized mixed text and rejects shaping and astral characters", () => {
    expect(analyzeText("Hello\n世界 こんにちは e\u0301").characters).toEqual([
      ..."Helo世界こんにちはé",
    ]);
    expect(analyzeText("مرحبا 😀 𠮷").unsupported).toEqual([..."مرحبا😀𠮷"]);
    expect(isSupported("\u0301")).toBe(false);
    expect(isSupported("\u202e")).toBe(false);
    expect(
      analyzeText(
        Array.from({ length: 513 }, (_, i) =>
          String.fromCodePoint(0x4e00 + i),
        ).join(""),
      ).overflow,
    ).toBe(true);
  });
  it("generates correctly paginated escaped guides", () => {
    const chars = [..."<&世界"];
    const svg = templateSvg(chars, 'A&B "font"', "project123", 0);
    expect(svg).toContain("A&amp;B &quot;font&quot;");
    expect(svg).toContain("&lt;");
    expect(pageCount(Array.from({ length: 512 }, () => "a"))).toBe(15);
    expect(cellRect(34).y + 144).toBeLessThan(1362);
  });
  it("round trips and rejects malformed sources without mutating the old project", () => {
    const p = newProject("Test", "a世界");
    expect(parseProject(serializeProject(p))).toEqual(p);
    expect(() => parseProject(JSON.stringify({ ...p, schema: 99 }))).toThrow(
      "projectVersion",
    );
    expect(() =>
      parseProject(JSON.stringify({ ...p, characters: ["b"] })),
    ).toThrow("invalidProject");
    expect(() => parseProject("{")).toThrow("invalidProject");
  });
  it("does not stretch a thin Han glyph and keeps descenders below the baseline", () => {
    const one = {
      character: "一",
      source: "",
      origin: "sample" as const,
      reviewed: false,
      settings: defaultSettings(),
      contours: [
        [
          { x: 0.1, y: 0.48 },
          { x: 0.9, y: 0.48 },
          { x: 0.9, y: 0.52 },
          { x: 0.1, y: 0.52 },
        ],
      ],
    };
    const g = fontGlyph(one);
    expect(g.yMax - g.yMin).toBe(40);
    expect(g.xMax - g.xMin).toBe(800);
    expect(g.advanceWidth).toBe(1000);
    expect(signedArea(g.contours[0])).toBeLessThan(0);
    const desc = fontGlyph({
      ...one,
      character: "g",
      contours: [
        [
          { x: 0.3, y: 0.6 },
          { x: 0.6, y: 0.6 },
          { x: 0.6, y: 0.95 },
          { x: 0.3, y: 0.95 },
        ],
      ],
    });
    expect(desc.yMin).toBe(-170);
  });
});

describe("characters from typed text", () => {
  it("lists only supported characters the project lacks, once each", () => {
    expect(charactersToAdd("hello JOB, hello!", ["H", "E", "L", "O"])).toEqual([
      "h",
      "e",
      "l",
      "o",
      "J",
      "B",
      ",",
      "!",
    ]);
    expect(charactersToAdd("a \u{1F600}\n a", ["a"])).toEqual([]);
    expect(charactersToAdd("", ["a"])).toEqual([]);
  });

  it("appends after the existing text so current cells keep their order", () => {
    const before = newProject("T", "Hello");
    const add = charactersToAdd("Help", before.characters);
    const after = updateText(before, appendCharacters(before.text, add));
    expect(after.characters).toEqual([...before.characters, "p"]);
    expect(appendCharacters("", ["a"])).toBe("a");
    expect(appendCharacters("Hi ", [])).toBe("Hi ");
  });
});

describe("character set presets", () => {
  it("keeps every preset within the supported range", () => {
    for (const set of Object.values(CHARACTER_SETS)) {
      expect(set.length).toBeGreaterThan(0);
      expect(set.every(isSupported)).toBe(true);
    }
    expect(CHARACTER_SETS.uppercase).toHaveLength(26);
    expect(CHARACTER_SETS.accentedLower).toHaveLength(30);
    expect(CHARACTER_SETS.accentedUpper).toHaveLength(28);
    expect(CHARACTER_SETS.hiragana).toHaveLength(83);
    expect(CHARACTER_SETS.katakana).toHaveLength(86);
    expect(CHARACTER_SETS.greek).toHaveLength(49);
    expect(CHARACTER_SETS.cyrillic).toHaveLength(66);
    expect(CHARACTER_SETS.hangulLetters).toHaveLength(51);
  });

  it("accepts Greek, Cyrillic and Hangul but still rejects combining marks", () => {
    const analysis = analyzeText("Ωμέγα Привет, мир Ёё 한글 ㄱㅏ");
    expect(analysis.unsupported).toEqual([]);
    expect(analysis.characters).toContain("한");
    expect(analysis.characters).toContain("Ё");
    expect(isSupported("\u0483")).toBe(false);
    expect(isSupported("\u03a2")).toBe(false);
    expect(isSupported("\u1100")).toBe(false);
  });

  it("gives Hangul a fixed cell and Greek and Cyrillic proportional spacing", () => {
    expect(isCjk("한")).toBe(true);
    expect(isCjk("ㄱ")).toBe(true);
    expect(isCjk("Ω")).toBe(false);
    expect(isCjk("Ж")).toBe(false);
  });

  it("appends only the characters the text is missing", () => {
    const text = addCharacterSet("Hello!", "digits");
    expect(text).toBe("Hello! 0123456789");
    expect(addCharacterSet(text, "digits")).toBe(text);
    expect(addCharacterSet("", "digits")).toBe("0123456789");
    expect(addCharacterSet("ABC", "uppercase")).toBe(
      `ABC ${CHARACTER_SETS.uppercase.slice(3).join("")}`,
    );
    expect(missingFromSet(text, "digits")).toEqual([]);
  });

  it("adds accented letters as precomposed characters", () => {
    const text = addCharacterSet("caf\u00e9", "accentedLower");
    expect(text.normalize("NFC")).toBe(text);
    expect([...text].filter((ch) => ch === "\u00e9")).toHaveLength(1);
    expect(analyzeText(text).unsupported).toEqual([]);
    expect(missingFromSet("\u00c0\u00c9", "accentedUpper")).toHaveLength(26);
    expect(new Set(CHARACTER_SETS.accentedLower).size).toBe(30);
    expect(new Set(CHARACTER_SETS.accentedUpper).size).toBe(28);
  });

  it("stays inside the glyph limit when every preset is added", () => {
    let text = "";
    for (const id of Object.keys(CHARACTER_SETS) as CharacterSetId[])
      text = addCharacterSet(text, id);
    const analysis = analyzeText(text);
    expect(analysis.unsupported).toEqual([]);
    expect(analysis.overflow).toBe(false);
  });
});

it("keeps A4 output unchanged and fits the same layout inside US Letter", () => {
  const project = newProject("Sheet", "AB");
  const a4 = templateSvg(project.characters, project.name, project.id, 0);
  expect(a4).toContain('viewBox="0 0 1000 1414" width="210mm" height="297mm"');
  expect(a4).toContain("/ A4 /");
  const letter = templateSvg(
    project.characters,
    project.name,
    project.id,
    0,
    undefined,
    "letter",
  );
  expect(letter).toContain('width="215.9mm" height="279.4mm"');
  expect(letter).toContain("/ US Letter /");
  expect(letter).not.toContain("/ A4 /");
  const [x, , width, height] = letter
    .match(/viewBox="([-\d. ]+)"/)?.[1]
    .split(" ")
    .map(Number) ?? [0, 0, 0, 0];
  // Same millimetres per layout unit on both axes, centred, nothing cropped.
  expect(width / height).toBeCloseTo(215.9 / 279.4, 3);
  expect(x).toBeCloseTo((1000 - width) / 2, 1);
  expect(x + width).toBeGreaterThan(1000);
  expect(letter.match(/d="M\d+ \d+h\d+/g)?.length).toBeGreaterThan(0);
});

it("chooses the paper from a saved value or the browser region", () => {
  expect(paperOrDefault("a4", "en-US")).toBe("a4");
  expect(paperOrDefault("letter", "de-DE")).toBe("letter");
  expect(paperOrDefault("", "en-US")).toBe("letter");
  expect(paperOrDefault(null, "fr-CA")).toBe("letter");
  expect(paperOrDefault("bogus", "es_MX")).toBe("letter");
  expect(paperOrDefault("", "en-GB")).toBe("a4");
  expect(paperOrDefault("", "ja")).toBe("a4");
});
