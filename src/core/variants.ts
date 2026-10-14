import { isCjk } from "./text";
import { MAX_GLYPHS, type Project } from "./types";

// A second version of a letter is one more template cell. Its key is the
// letter followed by a subscript two, so it reads as "a₂" in every list.
export const VARIANT_MARK = "₂";

export function isVariant(key: string): boolean {
  return key.length === 2 && key.endsWith(VARIANT_MARK);
}

export function variantKey(base: string): string {
  return base + VARIANT_MARK;
}

export function variantBase(key: string): string {
  return isVariant(key) ? key.slice(0, -1) : key;
}

/** Characters the project owner typed, without the second versions. */
export function typedCharacters(characters: readonly string[]): string[] {
  return characters.filter((key) => !isVariant(key));
}

/** Han, kana and Hangul sit in fixed cells and rarely repeat, so they have no second version. */
export function canHaveVariant(project: Project, character: string): boolean {
  return (
    !isVariant(character) &&
    project.characters.includes(character) &&
    !isCjk(character) &&
    !project.characters.includes(variantKey(character))
  );
}

/** Letters that can take a second version, in project order. */
export function variantCandidates(project: Project): string[] {
  return project.characters.filter(
    (ch) => /\p{L}/u.test(ch) && canHaveVariant(project, ch),
  );
}

/** Appends a cell for each letter after the existing ones, so printed pages keep their cells. */
export function addVariants(
  project: Project,
  bases: readonly string[],
): Project {
  const added = bases
    .filter((base, i) => bases.indexOf(base) === i)
    .filter((base) => canHaveVariant(project, base))
    .slice(0, MAX_GLYPHS - project.characters.length);
  if (!added.length) return project;
  return {
    ...project,
    characters: [...project.characters, ...added.map(variantKey)],
    updatedAt: new Date().toISOString(),
  };
}

/** True when the cell is the last one, so dropping it leaves the other cells in place. */
export function variantIsLast(project: Project, base: string): boolean {
  return project.characters.at(-1) === variantKey(base);
}

/**
 * Drops a second version. A cell in the middle moves every cell after it, so the
 * printed pages no longer match: those scans are cleared and the project gets a
 * new id, as when the typed characters change.
 */
export function removeVariant(project: Project, base: string): Project {
  const key = variantKey(base);
  if (!project.characters.includes(key)) return project;
  const { [key]: _, ...rest } = project.glyphs;
  const characters = project.characters.filter((ch) => ch !== key);
  const now = new Date().toISOString();
  if (variantIsLast(project, base))
    return { ...project, characters, glyphs: rest, updatedAt: now };
  return {
    ...project,
    id: crypto.randomUUID(),
    characters,
    glyphs: Object.fromEntries(
      Object.entries(rest).map(([ch, glyph]) => {
        const { pageId: __, ...unpaged } = glyph;
        return [ch, unpaged];
      }),
    ),
    pages: [],
    updatedAt: now,
  };
}
