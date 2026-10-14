import { createFont } from "fonteditor-core";
import { expect, it } from "vitest";
import { buildTtf, fontGlyph } from "../src/core/font";
import { blankGlyph, newProject } from "../src/core/project";
import type { Project } from "../src/core/types";

it("checks the actual rounding phase before losing a contour edge", () => {
  const glyph = blankGlyph("一", "");
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
