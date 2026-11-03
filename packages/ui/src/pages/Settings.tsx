import { useEffect, useState, type FormEvent } from "react";
import { LegalNotice } from "../components/LegalNotice";

interface SettingsProps {
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  legalBaseUrl?: string;
  agrixMode?: boolean;
  agrixConnected?: boolean;
  english?: boolean;
}

interface WorkspacePreferences {
  organization: string;
  location: string;
  currency: "XOF" | "EUR" | "USD";
  areaUnit: "ha" | "m²";
  timezone: string;
}

const storageKey = "gx.ai.workspace.preferences.v1";
const defaultPreferences: WorkspacePreferences = {
  organization: "AGRIX",
  location: "",
  currency: "XOF",
  areaUnit: "ha",
  timezone: "Africa/Abidjan",
};

function readPreferences(): WorkspacePreferences {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return defaultPreferences;
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return defaultPreferences;
    const record = parsed as Record<string, unknown>;
    return {
      organization: typeof record.organization === "string" ? record.organization.slice(0, 80) : defaultPreferences.organization,
      location: typeof record.location === "string" ? record.location.slice(0, 100) : "",
      currency: record.currency === "EUR" || record.currency === "USD" ? record.currency : "XOF",
      areaUnit: record.areaUnit === "m²" ? "m²" : "ha",
      timezone: typeof record.timezone === "string" ? record.timezone.slice(0, 80) : defaultPreferences.timezone,
    };
  } catch {
    return defaultPreferences;
  }
}

export function Settings({ accessCode, onAccessCodeChange, legalBaseUrl, agrixMode = false, agrixConnected = false, english = false }: SettingsProps) {
  const t = (en: string, fr: string) => english ? en : fr;
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<"general" | "privacy" | "diagnostics">("general");
  const [dataStatus, setDataStatus] = useState("");

  useEffect(() => {
    setPreferences(readPreferences());
  }, []);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        ...preferences,
        organization: preferences.organization.trim() || defaultPreferences.organization,
        location: preferences.location.trim(),
        timezone: preferences.timezone.trim() || defaultPreferences.timezone,
      }));
      setStatus("Préférences enregistrées sur cet appareil.");
    } catch {
      setStatus("Impossible d’enregistrer les préférences sur cet appareil.");
    }
  };

  const exportLocalData = () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        preferences: window.localStorage.getItem(storageKey),
        dossiers: window.localStorage.getItem("gx.ai.work.records.v1"),
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = agrixMode ? "gx-local-data.json" : "gx-donnees-locales.json";
      link.click();
      URL.revokeObjectURL(url);
      setDataStatus("Export local préparé. Le code d’accès n’est pas inclus.");
    } catch {
      setDataStatus("Impossible d’exporter les données locales sur cet appareil.");
    }
  };

  const deleteLocalDossiers = () => {
    if (!window.confirm(agrixMode ? "Permanently delete all local GX draft folders from this device? Account projects and conversations are not affected." : "Supprimer définitivement tous les brouillons de dossiers GX de cet appareil ?")) return;
    try {
      window.localStorage.removeItem("gx.ai.work.records.v1");
      setDataStatus("Tous les brouillons locaux GX ont été supprimés.");
    } catch {
      setDataStatus("Impossible de supprimer les brouillons locaux.");
    }
  };

  if (agrixMode) return (
    <section className="gx-settings" aria-labelledby="gx-settings-title" data-testid="view-settings">
      <h1 id="gx-settings-title">{t("Settings", "Paramètres")}</h1>
      <p>{t("Account access, local preferences and data controls for GX.ai.", "Accès au compte, préférences locales et contrôle des données GX.ai.")}</p>
      <div className="gx-settings-tabs" role="tablist" aria-label={t("Settings categories", "Catégories de paramètres")}>
        <button type="button" role="tab" aria-selected={tab === "general"} onClick={() => setTab("general")}>{t("General", "Général")}</button>
        <button type="button" role="tab" aria-selected={tab === "privacy"} onClick={() => setTab("privacy")}>{t("Privacy", "Confidentialité")}</button>
        <button type="button" role="tab" aria-selected={tab === "diagnostics"} onClick={() => setTab("diagnostics")}>{t("Diagnostics", "Diagnostic")}</button>
      </div>
      {tab === "general" && <div role="tabpanel" aria-label={t("General", "Général")}>
        <form className="gx-settings-card" onSubmit={save}>
          <div className="gx-settings-card-heading"><div><span className="gx-section-kicker">{t("01 · WORKSPACE", "01 · ESPACE DE TRAVAIL")}</span><h2>{t("Organization preferences", "Préférences de l’organisation")}</h2></div><span className="gx-local-badge">{t("On this device", "Sur cet appareil")}</span></div>
          <p>{t("These preferences help prepare work. Changing the organization name here does not create an account or change AGRIX data.", "Ces préférences aident à préparer le travail. Modifier le nom de l’organisation ici ne crée pas de compte et ne change pas les données AGRIX.")}</p>
          <div className="gx-settings-grid">
            <label>{t("Organization", "Organisation")}<input value={preferences.organization} maxLength={80} onChange={(event) => setPreferences((current) => ({ ...current, organization: event.target.value }))} /></label>
            <label>{t("Primary location", "Lieu principal")}<input value={preferences.location} maxLength={100} placeholder={t("City or region", "Ville ou région")} onChange={(event) => setPreferences((current) => ({ ...current, location: event.target.value }))} /></label>
            <label>{t("Currency", "Devise")}<select value={preferences.currency} onChange={(event) => setPreferences((current) => ({ ...current, currency: event.target.value as WorkspacePreferences["currency"] }))}><option value="XOF">{t("CFA franc (XOF)", "Franc CFA (XOF)")}</option><option value="EUR">Euro (EUR)</option><option value="USD">{t("US dollar (USD)", "Dollar US (USD)")}</option></select></label>
            <label>{t("Area unit", "Unité de surface")}<select value={preferences.areaUnit} onChange={(event) => setPreferences((current) => ({ ...current, areaUnit: event.target.value as WorkspacePreferences["areaUnit"] }))}><option value="ha">Hectare (ha)</option><option value="m²">{t("Square metre (m²)", "Mètre carré (m²)")}</option></select></label>
            <label className="gx-settings-wide">{t("Time zone", "Fuseau horaire")}<select value={preferences.timezone} onChange={(event) => setPreferences((current) => ({ ...current, timezone: event.target.value }))}><option value="Africa/Abidjan">Abidjan (UTC+0)</option><option value="Africa/Dakar">Dakar (UTC+0)</option><option value="Africa/Accra">Accra (UTC+0)</option><option value="Europe/Paris">Paris</option><option value="UTC">UTC</option></select></label>
          </div>
          <div className="gx-settings-actions"><button className="gx-primary-button" type="submit">{t("Save preferences", "Enregistrer les préférences")}</button>{status && <span role="status">{status === "Préférences enregistrées sur cet appareil." ? t("Preferences saved on this device.", status) : t("Could not save preferences on this device.", status)}</span>}</div>
        </form>
        <div className="gx-settings-card"><div className="gx-settings-card-heading"><div><span className="gx-section-kicker">{t("02 · GX.AI ACCESS", "02 · ACCÈS GX.AI")}</span><h2>{t("AGRIX account", "Compte AGRIX")}</h2></div></div><p>{agrixConnected ? t("Your AGRIX session is recognized. GX uses your account permissions.", "Votre session AGRIX est reconnue. GX utilise les autorisations de votre compte.") : t("Sign in to AGRIX to use GX.ai. Users do not need a model provider key.", "Connectez-vous à AGRIX pour utiliser GX.ai. Aucune clé de fournisseur IA n’est nécessaire.")}</p></div>
      </div>}
      {tab === "privacy" && <div className="gx-settings-card" role="tabpanel" aria-label={t("Privacy", "Confidentialité")}>
        <div className="gx-settings-card-heading"><div><span className="gx-section-kicker">{t("ACCOUNT AND DEVICE DATA", "DONNÉES DU COMPTE ET DE L’APPAREIL")}</span><h2>{t("Your data", "Vos données")}</h2></div></div>
        <p>{t("Account conversations and GX FieldOS projects are stored in AGRIX. Workspace preferences and draft workbench folders may remain on this device. Clearing local drafts does not delete account projects or conversations.", "Les conversations et projets GX FieldOS du compte sont enregistrés dans AGRIX. Les préférences et brouillons métier peuvent rester sur cet appareil. Effacer les brouillons locaux ne supprime pas les projets ni les conversations du compte.")}</p>
        <div className="gx-settings-data-actions"><button type="button" onClick={exportLocalData}>{t("Export local data", "Exporter les données locales")}</button><button type="button" className="is-danger" onClick={deleteLocalDossiers}>{t("Delete local drafts", "Supprimer les brouillons locaux")}</button></div>
        {dataStatus && <p role="status">{dataStatus === "Export local préparé. Le code d’accès n’est pas inclus." ? t("Local export prepared. No access code is included.", dataStatus) : dataStatus === "Tous les brouillons locaux GX ont été supprimés." ? t("Local GX drafts deleted.", dataStatus) : t("The local operation could not be completed.", dataStatus)}</p>}
      </div>}
      {tab === "diagnostics" && <div className="gx-settings-card" role="tabpanel" aria-label={t("Diagnostics", "Diagnostic")}>
        <div className="gx-settings-card-heading"><div><span className="gx-section-kicker">{t("SERVICE STATUS", "ÉTAT DU SERVICE")}</span><h2>{t("Available capabilities", "Fonctions disponibles")}</h2></div></div>
        <dl className="gx-settings-diagnostics"><div><dt>{t("GX chat", "Discussion GX")}</dt><dd>{agrixConnected ? t("AGRIX session recognized", "Session AGRIX reconnue") : t("AGRIX session required", "Session AGRIX nécessaire")}</dd></div><div><dt>{t("Field projects", "Projets terrain")}</dt><dd>{agrixConnected ? t("Saved to your AGRIX account", "Enregistrés dans votre compte AGRIX") : t("Sign in to view or save projects", "Connectez-vous pour voir ou enregistrer les projets")}</dd></div><div><dt>{t("Voice", "Voix")}</dt><dd>{t("Recording and transcription depend on device permission and service availability", "L’enregistrement et la transcription dépendent des autorisations de l’appareil et de la disponibilité du service")}</dd></div></dl>
      </div>}
      <LegalNotice baseUrl={legalBaseUrl} english={english} />
    </section>
  );

  return (
    <section className="gx-settings" aria-labelledby="gx-settings-title" data-testid="view-settings">
      <h1 id="gx-settings-title">Paramètres</h1>
      <p>Les réglages essentiels pour le Bureau, l’Entreprise, les Projets et le Terrain.</p>

      <div className="gx-settings-tabs" role="tablist" aria-label="Catégories des paramètres">
        <button type="button" role="tab" aria-selected={tab === "general"} onClick={() => setTab("general")}>Général</button>
        <button type="button" role="tab" aria-selected={tab === "privacy"} onClick={() => setTab("privacy")}>Confidentialité</button>
        <button type="button" role="tab" aria-selected={tab === "diagnostics"} onClick={() => setTab("diagnostics")}>Diagnostics</button>
      </div>

      {tab === "general" ? <div role="tabpanel" aria-label="Général">

      <form className="gx-settings-card" onSubmit={save}>
        <div className="gx-settings-card-heading">
          <div>
            <span className="gx-section-kicker">01 · ESPACE DE TRAVAIL</span>
            <h2>Repères de l’organisation</h2>
          </div>
          <span className="gx-local-badge">Sur cet appareil</span>
        </div>
        <p>Ces préférences facilitent la préparation du travail. Le nom de l’organisation ne crée pas de compte ni de séparation de données, et ne modifie pas Agrix.</p>
        <div className="gx-settings-grid">
          <label>Organisation active
            <input value={preferences.organization} maxLength={80} onChange={(event) => setPreferences((current) => ({ ...current, organization: event.target.value }))} />
          </label>
          <label>Localité principale
            <input value={preferences.location} maxLength={100} placeholder="Ville ou région" onChange={(event) => setPreferences((current) => ({ ...current, location: event.target.value }))} />
          </label>
          <label>Devise de travail
            <select value={preferences.currency} onChange={(event) => setPreferences((current) => ({ ...current, currency: event.target.value as WorkspacePreferences["currency"] }))}>
              <option value="XOF">Franc CFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </label>
          <label>Unité de surface
            <select value={preferences.areaUnit} onChange={(event) => setPreferences((current) => ({ ...current, areaUnit: event.target.value as WorkspacePreferences["areaUnit"] }))}>
              <option value="ha">Hectare (ha)</option>
              <option value="m²">Mètre carré (m²)</option>
            </select>
          </label>
          <label className="gx-settings-wide">Fuseau horaire
            <select value={preferences.timezone} onChange={(event) => setPreferences((current) => ({ ...current, timezone: event.target.value }))}>
              <option value="Africa/Abidjan">Abidjan (UTC+0)</option>
              <option value="Africa/Dakar">Dakar (UTC+0)</option>
              <option value="Africa/Accra">Accra (UTC+0)</option>
              <option value="Europe/Paris">Paris</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </div>
        <div className="gx-settings-actions">
          <button className="gx-primary-button" type="submit">Enregistrer les préférences</button>
          {status ? <span role="status">{status}</span> : null}
        </div>
      </form>

      <div className="gx-settings-card">
        <div className="gx-settings-card-heading">
          <div>
            <span className="gx-section-kicker">02 · ACCÈS GX.ai</span>
            <h2>{agrixMode ? "Compte Agrix" : "Accès au prototype local"}</h2>
          </div>
        </div>
        {agrixMode ? <p>{agrixConnected ? "Votre session Agrix est reconnue. GX utilise les droits et limites associés à votre compte." : "Connectez-vous à Agrix pour utiliser GX.ai. Aucune clé de modèle n’est demandée aux utilisateurs."}</p> : <>
        <p>Ce prototype local demande un code de test fourni par le développeur. Il reste seulement en mémoire sur cette page ; un rechargement l’efface. La clé du fournisseur de modèle reste sur le serveur et ne doit jamais être saisie ici.</p>
        <label htmlFor="gx-access-code">Code de test local GX.ai</label>
        <input
          id="gx-access-code"
          type="password"
          autoComplete="off"
          value={accessCode}
          onChange={(event) => onAccessCodeChange(event.target.value)}
        />
        {accessCode ? <button className="gx-text-button" type="button" onClick={() => onAccessCodeChange("")}>Effacer le code</button> : null}
        </>}
      </div>
      </div> : null}

      {tab === "privacy" ? <div className="gx-settings-card" role="tabpanel" aria-label="Confidentialité">
        <div className="gx-settings-card-heading"><div><span className="gx-section-kicker">DONNÉES LOCALES</span><h2>Vos dossiers sur cet appareil</h2></div></div>
        <p>GX conserve ici les brouillons de dossiers, images réduites, journaux préparatoires, livrables et préférences. Les conversations du chat disparaissent à la fermeture de la session. Les éléments d’un dossier restent locaux jusqu’au lancement volontaire d’une analyse GX.ai, qui transmet les données utiles et images jointes à OpenAI.</p>
        <div className="gx-settings-data-actions">
          <button type="button" onClick={exportLocalData}>Exporter les données locales</button>
          <button type="button" className="is-danger" onClick={deleteLocalDossiers}>Effacer tous les brouillons</button>
        </div>
        {dataStatus ? <p role="status">{dataStatus}</p> : null}
      </div> : null}

      {tab === "diagnostics" ? <div className="gx-settings-card" role="tabpanel" aria-label="Diagnostics">
        <div className="gx-settings-card-heading"><div><span className="gx-section-kicker">ÉTAT DU SERVICE</span><h2>Capacités disponibles</h2></div></div>
        <dl className="gx-settings-diagnostics">
          <div><dt>Chat GX</dt><dd>{agrixMode ? agrixConnected ? "Session Agrix reconnue · quota appliqué côté serveur" : "Session Agrix requise" : accessCode ? "Code d’accès saisi · service à vérifier lors du premier envoi" : "Code d’accès à saisir dans Général"}</dd></div>
          <div><dt>Dossiers</dt><dd>Enregistrement local sur cet appareil</dd></div>
          <div><dt>Email, WhatsApp et cloud computer</dt><dd>Connexion et exécution non disponibles</dd></div>
          <div><dt>Analyses métier</dt><dd>{agrixMode ? agrixConnected ? "Quota Agrix vérifié avant chaque analyse" : "Session Agrix requise" : accessCode ? "Code d’accès saisi · service à vérifier lors du premier lancement" : "Code d’accès à saisir dans Général"}</dd></div>
          <div><dt>Voix</dt><dd>Enregistrement et transcription après configuration du service</dd></div>
        </dl>
      </div> : null}
      <LegalNotice baseUrl={legalBaseUrl} />
    </section>
  );
}
