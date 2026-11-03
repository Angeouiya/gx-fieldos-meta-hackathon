import { useState } from "react";
import { Composer } from "../components/Composer";
import { DocumentExport } from "../components/DocumentExport";
import { LegalNotice } from "../components/LegalNotice";
import { gxDocumentLanguage, gxOriginalTextNotice } from "../documents/gx-document-language";
import type { LocalMessage } from "../types";

interface ConversationProps {
  english?: boolean;
  title: string;
  messages: readonly LocalMessage[];
  onSubmit: (message: string, speakReply?: boolean) => void;
  onScanPhoto?: (file: File) => Promise<void>;
  accessCode?: string;
  transcriptionEndpoint?: string;
  legalBaseUrl?: string;
  isLoading: boolean;
  onStop: () => void;
  error: string | null;
}

export function Conversation({ english = false, title, messages, onSubmit, onScanPhoto, accessCode, transcriptionEndpoint, legalBaseUrl, isLoading, onStop, error }: ConversationProps) {
  return (
    <section
      className="gx-conversation"
      aria-label={`Conversation ${title}`}
      data-testid="view-conversation"
    >
      <header className="gx-conversation-header">
        <span>{english ? "GX.ai conversation" : "Conversation GX.ai"}</span>
        <h1>{title}</h1>
      </header>

      <div className="gx-thread" aria-live="polite" aria-label="Messages">
        {messages.map((message) => <MessageItem key={message.id} message={message} english={english} />)}
        {isLoading ? <p className="gx-chat-status" role="status">{english ? "GX.ai is preparing a reply…" : "GX.ai prépare sa réponse…"} <button className="gx-chat-stop" type="button" onClick={onStop}>{english ? "Stop GX" : "Arrêter GX"}</button></p> : null}
        {error ? <p className="gx-chat-error" role="alert">{error}</p> : null}
      </div>

      <div className="gx-conversation-composer">
        <Composer compact english={english} disabled={isLoading} accessCode={accessCode} transcriptionEndpoint={transcriptionEndpoint} onSubmit={onSubmit} onScanPhoto={onScanPhoto} />
        <LegalNotice baseUrl={legalBaseUrl} english={english} />
      </div>
    </section>
  );
}

function MessageItem({ message, english }: { message: LocalMessage; english: boolean }) {
  const [copied, setCopied] = useState(false);
  const languageNotice = message.role === "assistant" && message.body ? gxOriginalTextNotice(gxDocumentLanguage(message.language), english) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const listen = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.body);
    utterance.lang = message.language === "en" ? "en-US" : message.language === "fr" ? "fr-FR" : english ? "en-US" : "fr-FR";
    window.speechSynthesis.speak(utterance);
  };
  return (
    <article className={`gx-message gx-message-${message.role}`}>
      <span className="gx-message-avatar" aria-hidden="true">{message.role === "assistant" ? "GX" : english ? "YOU" : "VO"}</span>
      <div className="gx-message-content">
        <div className="gx-message-heading">
          <strong>{message.role === "assistant" ? "GX.ai" : english ? "You" : "Vous"}</strong>
          {message.createdAt ? <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString(english ? "en-US" : "fr-FR", { hour: "2-digit", minute: "2-digit" })}</time> : null}
        </div>
        {message.imageDataUrl ? <img className="gx-message-photo" src={message.imageDataUrl} alt={english ? `Uploaded photo: ${message.imageName ?? "analysis"}` : `Photo envoyée : ${message.imageName ?? "analyse"}`} /> : null}
        {message.imageName && !message.imageDataUrl ? <p className="gx-message-photo-note">{english ? `Photo "${message.imageName}" used for analysis. Save it to a project to keep its views.` : `Photo « ${message.imageName} » utilisée pour l'analyse. Enregistrez-la dans un projet pour conserver ses vues.`}</p> : null}
        <p>{message.body}</p>
        {languageNotice ? <p className="gx-message-photo-note">{languageNotice} {!message.language ? english ? "Ask GX again for a reply in English." : "Redemandez une réponse en français à GX." : null}</p> : null}
        <div className="gx-message-tools">
          <button type="button" onClick={() => { void copy(); }}>{copied ? english ? "Copied" : "Copié" : english ? "Copy" : "Copier"}</button>
          {message.role === "assistant" ? <button type="button" onClick={listen}>{english ? "Listen" : "Écouter"}</button> : null}
        </div>
        {message.role === "assistant" && message.body ? <details className="gx-message-export"><summary>{english ? "Export reply" : "Exporter la réponse"}</summary><DocumentExport title={message.language === "en" ? "GX.ai reply" : message.language === "fr" ? "Réponse GX.ai" : "GX.ai"} content={message.body} sourceLanguage={gxDocumentLanguage(message.language)} english={english} /></details> : null}
      </div>
    </article>
  );
}
