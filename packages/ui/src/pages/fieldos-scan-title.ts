// Scan folder titles use the same simple dash as a typed name in GX.
export function scanFolderTitle(value: string): string {
  return value.trim().replace(/[\u2010-\u2015]/g, "-");
}
