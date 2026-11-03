const MAX_EXPORT_BYTES = 50 * 1024 * 1024;

export async function downloadFieldExport(path: string, filename: string, english: boolean): Promise<void> {
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null);
    const serverMessage = result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error : null;
    if (response.status === 401) throw new Error(english ? "Sign in to AGRIX to download this file." : "Connectez-vous à AGRIX pour télécharger ce fichier.");
    throw new Error(serverMessage ?? (english ? `Export unavailable (${response.status}).` : `Export indisponible (${response.status}).`));
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentType.includes("text/html") || contentType.includes("application/json")
    || contentLength > MAX_EXPORT_BYTES) {
    throw new Error(english ? "The document response is invalid." : "La réponse du document est invalide.");
  }
  const blob = await response.blob();
  if (!blob.size || blob.size > MAX_EXPORT_BYTES) {
    throw new Error(english ? "The document is empty or too large." : "Le document est vide ou trop volumineux.");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
