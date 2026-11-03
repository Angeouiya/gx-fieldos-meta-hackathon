export function LegalNotice({ english = false }: { baseUrl?: string; english?: boolean }) {
  return (
    <div className="gx-legal-notice">
      <span>{english ? "GX may make mistakes. Verify important information and decisions." : "GX peut faire des erreurs. Vérifiez les informations et décisions importantes."}</span>
      <span className="gx-legal-links">
        <a href="https://agrix.africa/privacy" target="_blank" rel="noopener noreferrer">{english ? "Privacy policy" : "Politique de confidentialité"}</a>
        <a href="https://agrix.africa/terms" target="_blank" rel="noopener noreferrer">{english ? "AGRIX terms of use" : "Conditions d’utilisation AGRIX"}</a>
      </span>
    </div>
  );
}
