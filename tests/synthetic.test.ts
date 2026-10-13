import { describe, expect, it } from "vitest";
import { SYNTHETIC_TEXT, syntheticCellSvg } from "../src/core/synthetic";

describe("synthetic demonstration strokes", () => {
  it("provides authored paths for every distinct non-space sample character", () => {
    const characters = [
      ...new Set([...SYNTHETIC_TEXT].filter((ch) => ch !== " ")),
    ];
    expect(characters).toHaveLength(18);
    for (const character of characters) {
      const svg = syntheticCellSvg(character);
      expect(svg).toContain('width="384" height="384"');
      expect(svg).toContain("<path d=");
      expect(svg).not.toMatch(
        /<text\b|font-family|font-face|fillText|strokeText|url\(/i,
      );
    }
  });

  it("rejects characters without an authored drawing", () => {
    expect(() => syntheticCellSvg("?")).toThrow("unsupportedCharacters");
  });
});
