import { expect, it } from "vitest";
import { base64 } from "../src/core/bytes";

it("encodes large scan cells without spreading them onto the call stack", () => {
  const bytes = Uint8Array.from({ length: 300000 }, (_, index) => index % 251);
  expect(Buffer.from(base64(bytes), "base64")).toEqual(Buffer.from(bytes));
});
