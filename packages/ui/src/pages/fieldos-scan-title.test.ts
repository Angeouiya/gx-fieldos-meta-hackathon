import { expect, test } from "vitest";
import { scanFolderTitle } from "./fieldos-scan-title";

test("scan folder names use a simple dash without changing other characters", () => {
  expect(scanFolderTitle("  01 — Site overview | four perspectives  ")).toBe("01 - Site overview | four perspectives");
  expect(scanFolderTitle("Zone sud – essai technique")).toBe("Zone sud - essai technique");
  expect(scanFolderTitle("Nord - sol et feuilles")).toBe("Nord - sol et feuilles");
  expect(scanFolderTitle("L'analyse du sol · feuilles")).toBe("L'analyse du sol · feuilles");
});
