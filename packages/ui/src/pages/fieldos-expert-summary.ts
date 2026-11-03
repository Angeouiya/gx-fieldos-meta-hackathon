type ViewFinding = { viewIndex: number; observations: string[] };

const previousFallbacks = new Set([
  "The photos may not show the same subject clearly. Only separate visible findings can be used until the views are checked.",
  "Les photos ne confirment pas clairement le même sujet. Seuls les constats visibles par vue peuvent être utilisés avant vérification.",
]);

/** Remove only a legacy heading added by the model, retaining the actual field check. */
export function fieldosFieldCheckText(value: string): string {
  const original = value.trim();
  const withoutHeading = original.replace(/^(?:(?:uncertainty|incertitude)\s*[:：]\s*)+/iu, "").trim();
  return withoutHeading;
}

export function fieldosExpertSummary(summary: string, views: ViewFinding[], english: boolean, fieldChecks: string[] = []): string {
  if (!previousFallbacks.has(summary.trim())) return summary;
  if (summary.trim().startsWith("The photos may")) english = true;
  if (summary.trim().startsWith("Les photos ne")) english = false;
  const findings = views.filter((view) => Number.isInteger(view.viewIndex) && view.viewIndex > 0).slice(0, 2).flatMap((view) => {
    const observation = view.observations.find((item) => typeof item === "string" && item.trim());
    return observation ? [`${english ? "View" : "Vue"} ${view.viewIndex}: ${observation.trim().replace(/[.\s]+$/, "")}.`] : [];
  });
  if (!findings.length) return summary;
  const nextCheck = fieldChecks.find((item) => typeof item === "string" && item.trim())?.trim();
  const action = nextCheck ? `${english ? "Next field check" : "Prochain contrôle terrain"}: ${nextCheck.replace(/[.\s]+$/, "")}.` : "";
  const ending = english
    ? "Keep these findings separate until the views are linked to the same subject."
    : "Garder ces constats distincts jusqu’à confirmation du lien entre les vues.";
  const parts = [...findings, action, ending].filter(Boolean);
  return parts.join(" ").length <= 1000 ? parts.join(" ") : [...findings, ending].join(" ");
}
