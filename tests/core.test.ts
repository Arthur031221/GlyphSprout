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
import { cellRect, pageCount, templateSvg } from "../src/core/template";
import { analyzeText, isSupported } from "../src/core/text";
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
