import { fieldosFieldCheckText } from "./fieldos-expert-summary";

export type FieldOSPlanContent = {
  scanCoverage?: { totalScans: number; analyzedScans: number; includedScans: number; pendingScans: number; omittedScans: number };
  comparisons?: { finding: string; scanIds: string[]; uncertainty: string }[];
  cropCandidates?: { name: string; rationale: string; evidenceIds: string[]; sourceUrls: string[]; missingChecks: string[]; sourceStatus: string }[];
  journey?: { phase: string; label: string; actions: string[]; checks: string[]; status: string }[];
};
const safeSource = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; } catch { return null; } };

export function FieldOSPlan({ content, scans, english = true }: { content: FieldOSPlanContent; scans: { id: string; title: string }[]; english?: boolean }) {
  const t = (en: string, fr: string) => english ? en : fr;
  const names = new Map(scans.map((scan) => [scan.id, scan.title]));
  const labels = (ids: string[]) => ids.map((id) => names.get(id) ?? id).join(" · ");
  const coverage = content.scanCoverage;
  if (!coverage && !content.comparisons?.length && !content.cropCandidates?.length && !content.journey?.length) return null;
  return <div className="gx-fieldos-plan-detail">
    <h4>{t("Multi-scan project analysis", "Analyse du projet multi-scan")}</h4>
    {coverage && <div className="gx-fieldos-plan-block"><strong>{t("Plan coverage", "Couverture du plan")}</strong><p>{coverage.includedScans} {t("scans compared out of", "scans comparés sur")} {coverage.totalScans} {t("recorded", "enregistrés")} · {coverage.pendingScans} {t("awaiting analysis", "en attente d’analyse")} · {coverage.omittedScans} {t("outside this plan.", "hors de ce plan.")}</p>{coverage.pendingScans + coverage.omittedScans > 0 && <small>{t("Partial plan: excluded scans do not support any conclusion.", "Plan partiel : les scans exclus ne justifient aucune conclusion.")}</small>}</div>}
    {Boolean(content.comparisons?.length) && <><h4>{t("Comparison across areas and subjects", "Comparaison des zones et sujets")}</h4>{content.comparisons?.map((item, index) => <div className="gx-fieldos-plan-block" key={index}><strong>{labels(item.scanIds)}</strong><p>{item.finding}</p>{item.uncertainty && fieldosFieldCheckText(item.uncertainty) && <small>{t("Field check", "Contrôle terrain")}: {fieldosFieldCheckText(item.uncertainty)}</small>}</div>)}</>}
    {Boolean(content.cropCandidates?.length) && <><h4>{t("Crop candidates to investigate", "Cultures à étudier")}</h4><p>{t("A photo cannot measure soil fertility. Check soil analysis, water, season, history and buyers.", "Une photo ne mesure pas la fertilité du sol. Vérifiez l’analyse du sol, l’eau, la saison, l’historique et les acheteurs.")}</p>{content.cropCandidates?.map((item, index) => <div className="gx-fieldos-plan-block" key={index}><strong>{item.name}</strong><p>{item.rationale}</p>{item.evidenceIds.length > 0 && <small>{t("Scans", "Scans")}: {labels(item.evidenceIds)}</small>}{item.missingChecks.length > 0 && <p>{t("Check", "À vérifier")}: {item.missingChecks.join(" ; ")}</p>}<small>{item.sourceStatus === "not_locally_verified" ? t("Local source unverified", "Source locale non vérifiée") : t("Sources cited; field check required", "Sources citées ; contrôle terrain nécessaire")}</small>{item.sourceUrls.map((url) => { const href = safeSource(url); return href ? <a key={url} href={href} target="_blank" rel="noopener noreferrer">{url}</a> : null; })}</div>)}</>}
    {Boolean(content.journey?.length) && <><h4>{t("Follow-up from clearing to sale", "Suivi du défrichage à la vente")}</h4><p>{t("The owner approves each version before implementation.", "Le propriétaire approuve chaque version avant sa mise en œuvre.")}</p><ol className="gx-fieldos-journey">{content.journey?.map((stage) => <li key={stage.phase}><strong>{stage.label}</strong><small>{stage.status === "needs_input" ? t("Field check before execution", "Contrôle terrain avant exécution") : t("Needs approval", "Approbation nécessaire")}</small>{stage.actions.length > 0 && <ul>{stage.actions.map((action, index) => <li key={index}>{action}</li>)}</ul>}{stage.checks.length > 0 && <p>{t("Checks", "Contrôles")}: {stage.checks.join(" ; ")}</p>}</li>)}</ol></>}
  </div>;
}
