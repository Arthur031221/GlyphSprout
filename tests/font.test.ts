import { createFont } from "fonteditor-core";
import { describe, expect, it } from "vitest";
import { buildTtf, fontGlyph, webFontCss } from "../src/core/font";
import {
  blankGlyph,
  newProject,
  parseProject,
  serializeProject,
} from "../src/core/project";
import type { Project } from "../src/core/types";

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
