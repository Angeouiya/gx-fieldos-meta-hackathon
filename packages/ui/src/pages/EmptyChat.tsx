import { Composer } from "../components/Composer";
import { LegalNotice } from "../components/LegalNotice";
import type { GXSystemInfo } from "../types";

interface EmptyChatProps {
  english?: boolean;
  runtime: "web" | "desktop";
  systemInfo?: GXSystemInfo | null;
  draft?: { id: number; text: string };
  accessCode?: string;
  transcriptionEndpoint?: string;
  legalBaseUrl?: string;
  onSubmit: (message: string, speakReply?: boolean) => void;
  onScanPhoto?: (file: File) => Promise<void>;
}

export function EmptyChat({ english = false, runtime, systemInfo, draft, accessCode, transcriptionEndpoint, legalBaseUrl, onSubmit, onScanPhoto }: EmptyChatProps) {
  const note = runtime === "desktop"
    ? systemInfo
      ? `GX.ai Desktop ${systemInfo.appVersion} · ${systemInfo.platform} · ${systemInfo.architecture}`
      : english ? "Connecting to the local service…" : "Connexion locale en cours…"
    : english ? "GX.ai is ready" : "GX.ai est prêt à échanger";

  return (
    <section className="gx-empty-chat" aria-labelledby="gx-empty-title" data-testid="view-chat">
      <div className="gx-empty-mark" aria-hidden="true">GX.ai</div>
      <h1 id="gx-empty-title">{english ? "What would you like to accomplish?" : "Que devons-nous accomplir ?"}</h1>
      <p className="gx-empty-description">{english ? "From the workspace to projects and the field, prepare a decision, a plan or your next action." : "Du Bureau aux Projets et au Terrain, préparez une décision, un plan ou une prochaine action."}</p>
      <Composer key={draft?.id ?? 0} english={english} initialValue={draft?.text} accessCode={accessCode} transcriptionEndpoint={transcriptionEndpoint} onSubmit={onSubmit} onScanPhoto={onScanPhoto} />
      <p className="gx-empty-note" role="status">{note}</p>
      <LegalNotice baseUrl={legalBaseUrl} english={english} />
    </section>
  );
}
