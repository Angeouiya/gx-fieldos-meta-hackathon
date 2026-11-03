import { useId, useState } from "react";

import { createGXDocumentBlob, gxExportFileName, type GXExportFormat } from "../documents/gx-document-export";
import { gxOriginalTextNotice, type GXDocumentLanguage } from "../documents/gx-document-language";

const formats: GXExportFormat[] = ["pdf", "docx", "pptx", "xlsx", "txt"];

export function DocumentExport({ title, content, excerpt = false, english = false, sourceLanguage, imported = false }: { title: string; content: string; excerpt?: boolean; english?: boolean; sourceLanguage?: GXDocumentLanguage; imported?: boolean }) {
  const id = useId();
  const [format, setFormat] = useState<GXExportFormat>("pdf");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const originalNotice = gxOriginalTextNotice(sourceLanguage, english, imported);

  const download = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const blob = await createGXDocumentBlob(title, content, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = gxExportFileName(title, format);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError(english ? "The file could not be generated. Try another format." : "Le fichier n’a pas pu être généré. Essayez un autre format.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="gx-document-export">
    <label htmlFor={id}>Format</label>
    <select id={id} value={format} disabled={busy} onChange={(event) => setFormat(event.target.value as GXExportFormat)}>
      {formats.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
    </select>
    <button type="button" disabled={busy} onClick={() => { void download(); }}>{busy ? english ? "Generating…" : "Génération…" : originalNotice ? english ? "Export original" : "Exporter l’original" : english ? "Download" : "Télécharger"}</button>
    {originalNotice ? <small className="gx-document-language-note">{originalNotice}</small> : null}
    {excerpt ? <small>{english ? "Only the saved text excerpt is converted. Original layout and images are not retained." : "Seul l’extrait de texte enregistré est converti. La mise en page et les images d’origine ne sont pas conservées."}</small> : null}
    {error ? <span role="alert">{error}</span> : null}
  </div>;
}
