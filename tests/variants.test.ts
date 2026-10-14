import { describe, expect, it } from "vitest";
import { buildTtf, missingCharacters } from "../src/core/font";
import { gsubTable, withTable } from "../src/core/gsub";
import {
  blankGlyph,
  newProject,
  parseProject,
  serializeProject,
  updateText,
} from "../src/core/project";
import type { Project } from "../src/core/types";
import {
  addVariants,
  canHaveVariant,
  isVariant,
  removeVariant,
  typedCharacters,
  variantBase,
  variantCandidates,
  variantKey,
} from "../src/core/variants";

const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

function inked(project: Project, key: string, width = 0.3): Project {
  const glyph = blankGlyph(key, PIXEL);
  glyph.contours = [
    [
      { x: 0.2, y: 0.2 },
      { x: 0.2 + width, y: 0.2 },
      { x: 0.2 + width, y: 0.7 },
      { x: 0.2, y: 0.7 },
    ],
  ];
  return { ...project, glyphs: { ...project.glyphs, [key]: glyph } };
}

describe("second versions of letters", () => {
  it("names the cell after the letter and keeps typed characters apart", () => {
    expect(variantKey("a")).toBe("a₂");
    expect(isVariant("a₂")).toBe(true);
    expect(isVariant("a")).toBe(false);
    expect(variantBase("a₂")).toBe("a");
    expect(typedCharacters(["a", "b", "a₂"])).toEqual(["a", "b"]);
  });

  it("appends cells for letters only and skips Han and repeated requests", () => {
    const project = newProject("T", "ab1字");
    expect(variantCandidates(project)).toEqual(["a", "b"]);
    expect(canHaveVariant(project, "字")).toBe(false);
    const next = addVariants(project, ["a", "字", "a", "x"]);
    expect(next.characters).toEqual(["a", "b", "1", "字", "a₂"]);
    expect(canHaveVariant(next, "a")).toBe(false);
    expect(addVariants(next, ["a"])).toBe(next);
  });

  it("stays inside the 512 cell limit", () => {
    const letters = Array.from({ length: 26 }, (_, i) =>
      String.fromCharCode(0x61 + i),
    );
    const project = newProject("T", letters.join(""));
    project.characters = [
      ...project.characters,
      ...Array.from({ length: 512 - 26 - 1 }, (_, i) =>
        String.fromCharCode(0x4e00 + i),
      ),
    ];
    const next = addVariants(project, ["a", "b", "c"]);
    expect(next.characters).toHaveLength(512);
  });

  it("round trips through a backup", () => {
    let project = inked(newProject("T", "ab"), "a");
    project = inked(addVariants(project, ["a"]), "a₂", 0.4);
    const back = parseProject(serializeProject(project));
    expect(back.characters).toEqual(["a", "b", "a₂"]);
    expect(Object.keys(back.glyphs)).toEqual(["a", "a₂"]);
  });

  it("rejects backups with a stray or repeated second version", () => {
    const project = addVariants(newProject("T", "ab字"), ["a"]);
    const json = JSON.parse(serializeProject(project));
    for (const characters of [
      ["a", "b", "字", "a₂", "a₂"],
      ["a", "b", "字", "z₂"],
      ["a", "b", "字", "字₂"],
      ["a", "b", "字", "ab"],
      ["a", "a₂", "b", "字"],
    ])
      expect(() =>
        parseProject(JSON.stringify({ ...json, characters })),
      ).toThrow("invalidProject");
  });

  it("keeps second versions of letters that stay when the text changes", () => {
    let project = addVariants(newProject("T", "abc"), ["a", "c"]);
    project = inked(project, "c₂");
    const same = updateText(project, "a b c");
    expect(same.id).toBe(project.id);
    expect(same.characters).toEqual(project.characters);
    const changed = updateText(project, "ac");
    expect(changed.id).not.toBe(project.id);
    expect(changed.characters).toEqual(["a", "c", "a₂", "c₂"]);
    expect(changed.glyphs["c₂"]).toBeDefined();
    expect(updateText(project, "bc").characters).toEqual(["b", "c", "c₂"]);
  });

  it("drops the last cell without disturbing the others", () => {
    const project = inked(addVariants(newProject("T", "ab"), ["a", "b"]), "b₂");
    project.pages = [
      {
        id: "p",
        pageIndex: 0,
        image: "",
        corners: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
        width: 1,
        height: 1,
      },
    ];
    const next = removeVariant(project, "b");
    expect(next.characters).toEqual(["a", "b", "a₂"]);
    expect(next.id).toBe(project.id);
    expect(next.pages).toHaveLength(1);
    expect(next.glyphs["b₂"]).toBeUndefined();
  });

  it("starts over when a cell in the middle goes, because the printed pages shift", () => {
    let project = inked(addVariants(newProject("T", "ab"), ["a", "b"]), "b₂");
    project = { ...project, pages: [{ id: "p" } as never] };
    const next = removeVariant(project, "a");
    expect(next.characters).toEqual(["a", "b", "b₂"]);
    expect(next.id).not.toBe(project.id);
    expect(next.pages).toEqual([]);
    expect(next.glyphs["b₂"]).toBeDefined();
  });

  it("does not hold back the font while a second version is empty", () => {
    let project = inked(newProject("T", "ab"), "a");
    project = inked(project, "b");
    project = addVariants(project, ["a"]);
    expect(missingCharacters(project)).toEqual([]);
    expect(() => buildTtf(project)).not.toThrow();
  });
});

describe("contextual alternates table", () => {
  const sfnt = (font: ArrayBuffer) => {
    const view = new DataView(font);
    const tables = new Map<string, { offset: number; length: number }>();
    for (let i = 0; i < view.getUint16(4); i++) {
      const at = 12 + i * 16;
      tables.set(String.fromCharCode(...new Uint8Array(font, at, 4)), {
        offset: view.getUint32(at + 8),
        length: view.getUint32(at + 12),
      });
    }
    return { view, tables };
  };
  const sum = (font: ArrayBuffer, offset = 0, length = font.byteLength) => {
    const bytes = new Uint8Array(font, offset, length);
    let total = 0;
    for (let i = 0; i < bytes.length; i += 4)
      total +=
        ((bytes[i] << 24) |
          ((bytes[i + 1] ?? 0) << 16) |
          ((bytes[i + 2] ?? 0) << 8) |
          (bytes[i + 3] ?? 0)) >>>
        0;
    return total >>> 0;
  };

  function withVariants() {
    let project = newProject("Alt", "ab");
    project.id = "alt-fixture";
    project = inked(inked(project, "a"), "b", 0.25);
    project = addVariants(project, ["a"]);
    return inked(project, "a₂", 0.45);
  }

  it("adds a GSUB table to the font and keeps it a valid sfnt", () => {
    const font = buildTtf(withVariants());
    const { view, tables } = sfnt(font);
    expect(tables.has("GSUB")).toBe(true);
    expect(tables.has("kern") || tables.has("glyf")).toBe(true);
    const keys = [...tables.keys()];
    expect(keys).toEqual([...keys].sort());
    for (const [name, { offset, length }] of tables) {
      if (name === "head") continue;
      expect(view.getUint32(12 + keys.indexOf(name) * 16 + 4), name).toBe(
        sum(font, offset, length),
      );
    }
    expect(sum(font)).toBe(0xb1b0afba);
  });

  it("maps a to its second version when a first version comes before it", () => {
    const font = buildTtf(withVariants());
    const { view, tables } = sfnt(font);
    const gsub = tables.get("GSUB");
    if (!gsub) throw new Error("no GSUB");
    const base = gsub.offset;
    expect(view.getUint16(base)).toBe(1);
    const lookupList = base + view.getUint16(base + 8);
    expect(view.getUint16(lookupList)).toBe(2);
    const chain = lookupList + view.getUint16(lookupList + 2);
    expect(view.getUint16(chain)).toBe(6);
    const chainTable = chain + view.getUint16(chain + 6);
    expect(view.getUint16(chainTable)).toBe(3);
    const single = lookupList + view.getUint16(lookupList + 4);
    const singleTable = single + view.getUint16(single + 6);
    expect(view.getUint16(singleTable)).toBe(2);
    const count = view.getUint16(singleTable + 4);
    expect(count).toBe(1);
    const substitute = view.getUint16(singleTable + 6);
    const coverage = singleTable + view.getUint16(singleTable + 2);
    const covered = view.getUint16(coverage + 4);
    // Glyphs: notdef, space, a, b, a.alt
    expect(covered).toBe(2);
    expect(substitute).toBe(4);
  });

  it("round trips a table through withTable", () => {
    const font = buildTtf(withVariants());
    const again = withTable(
      font,
      "GSUB",
      gsubTable([{ base: 2, alt: 4 }], [2, 3]),
    );
    expect(sfnt(again).tables.has("GSUB")).toBe(true);
    expect(sum(again)).toBe(0xb1b0afba);
  });

  it("leaves a font without second versions alone", () => {
    const project = inked(newProject("Plain", "a"), "a");
    expect(sfnt(buildTtf(project)).tables.has("GSUB")).toBe(false);
  });
});
