import { expect, it } from "vitest";
import { wrapSpecimen } from "../src/core/specimen";

const measure = (value: string) => Array.from(value).length * 10;

it("wraps at spaces and keeps blank lines", () => {
  expect(wrapSpecimen("hello big world\n\nok", 100, measure)).toEqual([
    "hello big",
    "world",
    "",
    "ok",
  ]);
});

it("splits a word that cannot fit and breaks between Han characters", () => {
  expect(wrapSpecimen("abcdefghijkl", 50, measure)).toEqual([
    "abcde",
    "fghij",
    "kl",
  ]);
  expect(wrapSpecimen("字體很好看的手寫", 40, measure)).toEqual([
    "字體很好",
    "看的手寫",
  ]);
});

it("ignores leading spaces and limits very long text", () => {
  expect(wrapSpecimen("   a", 50, measure)).toEqual(["a"]);
  expect(wrapSpecimen("a\n".repeat(100), 50, measure)).toHaveLength(24);
});
