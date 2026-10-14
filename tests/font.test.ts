import { createFont } from "fonteditor-core";
import { describe, expect, it } from "vitest";
import { buildTtf, fontGlyph, webFontCss } from "../src/core/font";
import {
  blankGlyph,
  cleanFontInfo,
  newProject,
  parseProject,
  serializeProject,
  updateText,
} from "../src/core/project";
import { OFL_LICENSE, OFL_URL, type Project } from "../src/core/types";

it("checks the actual rounding phase before losing a contour edge", () => {
  const glyph = blankGlyph("一", "");
  glyph.settings.smoothing = 0;
  glyph.contours = [
    [
      { x: 0.2004, y: 0.2 },
      { x: 0.2008, y: 0.2 },
      { x: 0.4, y: 0.4 },
      { x: 0.1, y: 0.4 },
    ],
  ];
  expect(() => fontGlyph(glyph)).not.toThrow();
  glyph.settings.offsetX = 0.2;
  expect(() => fontGlyph(glyph)).toThrow("collapsedContour");
});

function namedProject(name: string): Project {
  const project = newProject(name, "A");
  project.id = "font-identity-fixture";
  const glyph = blankGlyph("A", "");
  glyph.contours = [
    [
      { x: 0.2, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.7 },
      { x: 0.2, y: 0.7 },
    ],
  ];
  project.glyphs.A = glyph;
  return project;
}

function names(project: Project) {
  return createFont(buildTtf(project), { type: "ttf" }).get().name;
}

for (const [first, second] of [
  ["字體甲", "字體乙"],
  ["A B", "AB"],
  ["Café", "Cafe"],
]) {
  it(`distinguishes exported identities for ${first} and ${second}`, () => {
    const a = names(namedProject(first));
    const b = names(namedProject(second));
    expect(a.fontFamily).toBe(first);
    expect(b.fontFamily).toBe(second);
    expect(a.postScriptName).not.toBe(b.postScriptName);
    expect(a.uniqueSubFamily).not.toBe(b.uniqueSubFamily);
    for (const value of [a.postScriptName, b.postScriptName])
      expect(value).toMatch(/^[A-Za-z0-9-]{1,63}$/);
  });
}

it("distinguishes separate projects with the same family name", () => {
  const project = namedProject("Weekend");
  const other = { ...project, id: "another-font-project" };
  expect(names(project).postScriptName).not.toBe(names(other).postScriptName);
  expect(names(project).uniqueSubFamily).not.toBe(names(other).uniqueSubFamily);
});

it("keeps font identity stable across revisions of one named project", () => {
  const project = namedProject("Weekend");
  const revision = {
    ...project,
    updatedAt: "2026-10-14T00:00:00Z",
    glyphs: {
      A: { ...project.glyphs.A, reviewed: true },
    },
  };
  expect(names(revision)).toEqual(names(project));
});

function spaceAdvance(project: Project): number {
  const font = createFont(buildTtf(project), { type: "ttf" }).get();
  const space = font.glyf.find((glyph) => glyph.unicode?.includes(32));
  if (!space) throw new Error("missing space glyph");
  return space.advanceWidth ?? 0;
}

it("uses the project word space for the space glyph", () => {
  const project = namedProject("Spacing");
  expect(spaceAdvance(project)).toBe(350);
  project.spaceWidth = 520;
  expect(spaceAdvance(project)).toBe(520);
});

it("keeps the word space through a project round trip and rejects bad values", () => {
  const project = namedProject("Spacing");
  project.glyphs.A.source = "data:image/png;base64,iVBORw0KGgo=";
  project.spaceWidth = 480;
  expect(parseProject(serializeProject(project)).spaceWidth).toBe(480);
  project.spaceWidth = undefined;
  expect(parseProject(serializeProject(project)).spaceWidth).toBeUndefined();
  project.spaceWidth = 480;
  for (const bad of [99, 1001, 350.5, "350", null]) {
    const broken = JSON.parse(serializeProject(project));
    broken.spaceWidth = bad;
    expect(() => parseProject(JSON.stringify(broken))).toThrow(
      "invalidProject",
    );
  }
});

describe("web font css", () => {
  it("references the downloaded file names and a safe family", () => {
    const css = webFontCss('My "Hand" <writing>/1');
    expect(css).toContain('font-family: "My Hand writing1";');
    expect(css).toContain('url("My%20Hand%20writing1.woff2") format("woff2")');
    expect(css).toContain('url("My%20Hand%20writing1.ttf") format("truetype")');
    expect(css).toContain("font-display: swap;");
    expect(css).not.toMatch(/[<>]/);
  });
});

describe("font information", () => {
  it("writes designer, copyright and license into the name table", () => {
    const project = namedProject("Weekend");
    project.info = {
      designer: "Ada Writer",
      copyright: "Copyright 2026 Ada Writer",
      license: OFL_LICENSE,
      licenseUrl: OFL_URL,
    };
    const name = names(project);
    expect(name.designer).toBe("Ada Writer");
    expect(name.copyright).toBe("Copyright 2026 Ada Writer");
    expect(name.licence).toBe(OFL_LICENSE);
    expect(name.urlOfLicence).toBe(OFL_URL);
    expect(names(namedProject("Weekend")).designer).toBeUndefined();
  });

  it("keeps the information through a project round trip and rejects bad values", () => {
    const project = namedProject("Weekend");
    project.glyphs.A.source = "data:image/png;base64,iVBORw0KGgo=";
    project.info = { designer: "Ada Writer", licenseUrl: OFL_URL };
    expect(parseProject(serializeProject(project)).info).toEqual(project.info);
    project.info = undefined;
    expect(parseProject(serializeProject(project)).info).toBeUndefined();
    for (const bad of [
      { designer: 5 },
      { designer: "x".repeat(101) },
      { designer: " padded" },
      { copyright: "two\nlines" },
      { licenseUrl: "ftp://example.com" },
      { licenseUrl: "not a url" },
      "text",
    ]) {
      const broken = JSON.parse(serializeProject(project));
      broken.info = bad;
      expect(() => parseProject(JSON.stringify(broken))).toThrow(
        "invalidProject",
      );
    }
  });

  it("cleans whitespace and drops empty fields", () => {
    expect(
      cleanFontInfo({ designer: "  Ada \n Writer ", copyright: "   " }),
    ).toEqual({ designer: "Ada Writer" });
    expect(() => cleanFontInfo({ licenseUrl: "example.com" })).toThrow(
      "invalidProject",
    );
  });
});

describe("kerning pairs", () => {
  function kernedProject(): Project {
    const project = newProject("Kerned", "AB");
    const square = [
      { x: 0.2, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.7 },
      { x: 0.2, y: 0.7 },
    ];
    for (const ch of ["A", "B"]) {
      const glyph = blankGlyph(ch, "data:image/png;base64,iVBORw0KGgo=");
      glyph.contours = [square];
      project.glyphs[ch] = glyph;
    }
    return project;
  }

  // Reads the kern table straight from the file: every pair as [left, right, value].
  function readKern(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    for (let i = 0; i < view.getUint16(4); i++) {
      const entry = 12 + i * 16;
      const tag = String.fromCharCode(...new Uint8Array(buffer, entry, 4));
      if (tag !== "kern") continue;
      const table = view.getUint32(entry + 8);
      const pairs = view.getUint16(table + 10);
      const rows: number[][] = [];
      for (let p = 0; p < pairs; p++) {
        const at = table + 18 + p * 6;
        rows.push([
          view.getUint16(at),
          view.getUint16(at + 2),
          view.getInt16(at + 4),
        ]);
      }
      return rows;
    }
    return null;
  }

  it("writes a sorted kern table with signed values", () => {
    const project = kernedProject();
    project.kerning = [
      { left: "B", right: "A", value: 40 },
      { left: "A", right: "B", value: -80 },
    ];
    expect(readKern(buildTtf(project))).toEqual([
      [2, 3, -80],
      [3, 2, 40],
    ]);
  });

  it("writes no kern table without pairs", () => {
    expect(readKern(buildTtf(kernedProject()))).toBeNull();
  });

  it("skips pairs whose glyph is not part of a partial export", () => {
    const project = kernedProject();
    project.glyphs.B.contours = [];
    project.kerning = [{ left: "A", right: "B", value: -50 }];
    expect(readKern(buildTtf(project, true))).toBeNull();
  });

  it("keeps pairs in a backup and rejects invalid ones", () => {
    const project = kernedProject();
    project.kerning = [{ left: "A", right: "B", value: -80 }];
    expect(parseProject(serializeProject(project)).kerning).toEqual(
      project.kerning,
    );
    for (const bad of [
      [{ left: "A", right: "B", value: 0 }],
      [{ left: "A", right: "B", value: 301 }],
      [{ left: "A", right: "B", value: 2.5 }],
      [{ left: "A", right: "Z", value: 10 }],
      [
        { left: "A", right: "B", value: 10 },
        { left: "A", right: "B", value: 20 },
      ],
      [{ left: "AB", right: "B", value: 10 }],
      "AB",
    ]) {
      const broken = JSON.parse(serializeProject(project));
      broken.kerning = bad;
      expect(() => parseProject(JSON.stringify(broken))).toThrow(
        "invalidProject",
      );
    }
  });

  it("drops pairs for characters that leave the project", () => {
    const project = kernedProject();
    project.kerning = [{ left: "A", right: "B", value: -80 }];
    expect(updateText(project, "ABBA").kerning).toEqual(project.kerning);
    expect(updateText(project, "AC").kerning).toBeUndefined();
  });
});
