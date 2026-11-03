import { describe, expect, test } from "vitest";
import { fieldDirectionsUrl } from "./field-directions";

describe("field directions", () => {
  test("uses only a validated recorded coordinate as destination", () => {
    const destination = fieldDirectionsUrl(5.1234567, -4.1234567);
    expect(destination).not.toBeNull();
    const url = new URL(destination!);
    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("destination")).toBe("5.123457,-4.123457");
    expect(url.searchParams.has("origin")).toBe(false);
    expect(fieldDirectionsUrl(null, -4)).toBeNull();
    expect(fieldDirectionsUrl(91, -4)).toBeNull();
  });
});
