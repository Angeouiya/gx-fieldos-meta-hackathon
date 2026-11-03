export type GXDocumentLanguage = "en" | "fr";

export function gxDocumentLanguage(value: unknown): GXDocumentLanguage | undefined {
  return value === "en" || value === "fr" ? value : undefined;
}

export function gxOriginalTextNotice(language: GXDocumentLanguage | undefined, english: boolean, imported = false): string {
  if (imported) return english
    ? "Imported source text. Changing the GX interface language does not translate this document; the export keeps its original wording."
    : "Texte source importé. Changer la langue de GX ne traduit pas ce document ; l’export conserve son texte d’origine.";
  if (!language) return english
    ? "The language of this saved text was not recorded. Changing the GX interface language does not translate it; the export keeps the original wording."
    : "La langue de ce texte enregistré n’a pas été conservée. Changer la langue de GX ne le traduit pas ; l’export garde le texte d’origine.";
  if (language === (english ? "en" : "fr")) return "";
  return english
    ? "Saved in French. Changing the GX interface language does not translate this text; the export keeps the French original. Generate it again in English for an English document."
    : "Enregistré en anglais. Changer la langue de GX ne traduit pas ce texte ; l’export garde l’original anglais. Générez-le à nouveau en français pour obtenir un document français.";
}
