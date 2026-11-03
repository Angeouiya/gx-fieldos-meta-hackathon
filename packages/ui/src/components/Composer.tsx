import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { Icon } from "./Icon";
import { extractGXDocument, GXDocumentError } from "../documents/gx-document-extract";

interface ComposerProps {
  english?: boolean;
  compact?: boolean;
  disabled?: boolean;
  initialValue?: string;
  accessCode?: string;
  transcriptionEndpoint?: string;
  onSubmit?: (message: string, speakReply?: boolean) => void;
  onScanPhoto?: (file: File) => Promise<void>;
}

type RecordingMode = "dictate" | "talk";

export function Composer({ english = false, compact = false, disabled = false, initialValue = "", accessCode = "", transcriptionEndpoint = "/api/transcribe", onSubmit, onScanPhoto }: ComposerProps) {
  const t = (fr: string, en: string) => english ? en : fr;
  const [value, setValue] = useState(initialValue);
  const [attachment, setAttachment] = useState<{ name: string; text: string; truncated: boolean } | null>(null);
  const [recording, setRecording] = useState<RecordingMode | null>(null);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    if (recorder.current) recorder.current.onstop = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    audioStream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const compose = (text: string) => {
    const body = text.trim();
    if (!attachment) return body;
    return `${body}\n\n${t(`Document « ${attachment.name} » (source de données${attachment.truncated ? ", extrait partiel" : ""})`, `Document "${attachment.name}" (data source${attachment.truncated ? ", partial excerpt" : ""})`)}:\n${attachment.text}`.trim().slice(0, 4000);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (attachment && value.trim().length > 600) {
      setFeedback(t("Pour envoyer le document, limitez votre texte à 600 caractères. L’extrait joint restera visible par GX.", "To send the document, keep your message under 600 characters. GX will also receive the attached excerpt."));
      return;
    }
    const message = compose(value);
    if (!message || disabled || processing) return;
    onSubmit?.(message);
    setValue("");
    setAttachment(null);
    setFeedback("");
  };

  const attach = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProcessing(true);
    setFeedback(t("Lecture du document…", "Reading document…"));
    try {
      const excerpt = await extractGXDocument(file);
      setAttachment({ name: excerpt.name, text: excerpt.excerpt.slice(0, 3000), truncated: excerpt.truncated || excerpt.excerpt.length > 3000 });
      setFeedback(t("L’extrait du document sera envoyé avec votre message. Limitez votre texte à 600 caractères et vérifiez les passages partiels.", "The document excerpt will be sent with your message. Keep your text under 600 characters and check partial excerpts."));
    } catch (error) {
      const code = error instanceof GXDocumentError ? error.code : "unreadable";
      setFeedback(code === "format" ? t("Formats acceptés : PDF, DOCX, PPTX, XLSX, TXT, MD, CSV ou JSON.", "Accepted formats: PDF, DOCX, PPTX, XLSX, TXT, MD, CSV or JSON.") : code === "size" ? t("PDF : 4 Mo ; Office : 8 Mo ; texte : 512 Ko maximum.", "Maximum size: PDF 4 MB, Office 8 MB, text 512 KB.") : code === "empty" ? t("Aucun texte lisible. Un PDF scanné nécessite une reconnaissance de texte.", "No readable text. A scanned PDF needs text recognition.") : t("Ce document n’a pas pu être lu.", "This document could not be read."));
    } finally {
      setProcessing(false);
    }
  };

  const scanPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onScanPhoto) return;
    setProcessing(true);
    setFeedback(t("Préparation de la photo…", "Preparing photo…"));
    try {
      await onScanPhoto(file);
      setFeedback("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("La photo n’a pas pu être ajoutée.", "The photo could not be added."));
    } finally {
      setProcessing(false);
    }
  };

  const transcribe = async (blob: Blob, mode: RecordingMode) => {
    setProcessing(true);
    setFeedback(t("Transcription en cours…", "Transcribing…"));
    try {
      const form = new FormData();
      form.set("audio", new File([blob], "message.webm", { type: blob.type || "audio/webm" }));
      const response = await fetch(transcriptionEndpoint, { method: "POST", headers: { Authorization: `Bearer ${accessCode.trim()}` }, body: form });
      const payload: unknown = await response.json().catch(() => null);
      const result = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      if (!response.ok || typeof result.text !== "string") throw new Error(typeof result.error === "string" ? result.error : t("La transcription a échoué.", "Transcription failed."));
      const text = result.text.trim().slice(0, 4000);
      if (mode === "talk") {
        if (attachment && text.length > 600) {
          setValue(text);
          setFeedback(t("Transcription ajoutée. Pour envoyer aussi le document, réduisez le texte à 600 caractères.", "Transcription added. Reduce your text to 600 characters to include the document."));
          return;
        }
        onSubmit?.(compose(text), true);
        setValue("");
        setAttachment(null);
        setFeedback(t("Message vocal envoyé. GX lira sa réponse sur cet appareil.", "Voice message sent. GX will read its reply on this device."));
      } else {
        setValue((current) => `${current.trim()} ${text}`.trim().slice(0, 4000));
        setFeedback(t("Transcription ajoutée au message. Vérifiez-la avant l’envoi.", "Transcription added to your message. Check it before sending."));
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("La transcription a échoué.", "Transcription failed."));
    } finally {
      setProcessing(false);
    }
  };

  const toggleRecording = async (mode: RecordingMode) => {
    if (recording) {
      recorder.current?.stop();
      setRecording(null);
      return;
    }
    if (!accessCode.trim()) { setFeedback(t("Ajoutez le code de test local GX.ai dans Paramètres pour utiliser la voix.", "Sign in to AGRIX or add a local GX.ai test code in Settings to use voice.")); return; }
    if (mode === "talk" && (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined")) {
      setFeedback(t("La lecture vocale des réponses n’est pas disponible sur cet appareil.", "Spoken replies are unavailable on this device."));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setFeedback(t("L’enregistrement vocal n’est pas disponible dans ce navigateur.", "Voice recording is unavailable in this browser.")); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;
      chunks.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = () => {
        if (recordingTimer.current) clearTimeout(recordingTimer.current);
        stream.getTracks().forEach((track) => track.stop());
        audioStream.current = null;
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        if (blob.size > 100) void transcribe(blob, mode);
        else setFeedback(t("Enregistrement trop court. Réessayez.", "Recording too short. Try again."));
      };
      mediaRecorder.start();
      recordingTimer.current = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setRecording(null);
        }
      }, 90_000);
      setRecording(mode);
      setFeedback(mode === "talk" ? t("Discussion vocale : parlez, puis appuyez pour envoyer.", "Voice chat: speak, then tap to send.") : t("Dictée : parlez, puis appuyez pour transcrire.", "Dictation: speak, then tap to transcribe."));
    } catch {
      setFeedback(t("Accès au microphone refusé ou indisponible.", "Microphone access denied or unavailable."));
    }
  };

  return (
    <form className={`gx-composer${compact ? " is-compact" : ""}`} onSubmit={submit}>
      <label className="gx-sr-only" htmlFor={compact ? "gx-reply" : "gx-prompt"}>{t("Écrivez à GX.ai", "Write to GX.ai")}</label>
      <textarea id={compact ? "gx-reply" : "gx-prompt"} name="prompt" rows={compact ? 1 : 2} maxLength={4000} value={value} onChange={(event) => setValue(event.target.value)} placeholder={t("Écrivez à GX.ai…", "Write to GX.ai…")} disabled={disabled || processing} />
      {attachment ? <div className="gx-composer-attachment"><span>{attachment.name}{attachment.truncated ? t(" · extrait partiel", " · partial excerpt") : ""}</span><button type="button" onClick={() => setAttachment(null)} aria-label={t("Retirer la pièce jointe", "Remove attachment")}><Icon name="close" /></button></div> : null}
      {feedback ? <p className="gx-composer-feedback" role="status">{feedback}</p> : null}
      <div className="gx-composer-actions">
        <input ref={fileInput} className="gx-sr-only" type="file" accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.json" aria-label={t("Choisir un document", "Choose a document")} onChange={(event) => { void attach(event); }} />
        <button className="gx-icon-button" type="button" aria-label={t("Joindre un document", "Attach a document")} title={t("Joindre un PDF, Word, PowerPoint, Excel ou fichier texte", "Attach a PDF, Word, PowerPoint, Excel or text file")} disabled={disabled || processing} onClick={() => fileInput.current?.click()}><Icon name="paperclip" /></button>
        {onScanPhoto ? <div className="gx-composer-photo-actions">
          <label className="gx-composer-photo" title={t("Charger une photo", "Upload a photo")}><Icon name="package" /><input type="file" accept="image/*" aria-label={t("Charger une photo", "Upload a photo")} disabled={disabled || processing} onChange={(event) => { void scanPhoto(event); }} /></label>
          <label className="gx-composer-photo" title={t("Prendre une photo", "Take a photo")}><Icon name="camera" /><input type="file" accept="image/*" capture="environment" aria-label={t("Prendre une photo", "Take a photo")} disabled={disabled || processing} onChange={(event) => { void scanPhoto(event); }} /></label>
        </div> : null}
        <div className="gx-composer-actions-right">
          <button className={`gx-icon-button${recording === "dictate" ? " is-recording" : ""}`} type="button" aria-label={recording === "dictate" ? t("Arrêter et transcrire", "Stop and transcribe") : t("Dicter un message", "Dictate a message")} title={t("Dicter et transcrire", "Dictate and transcribe")} disabled={disabled || processing} onClick={() => { void toggleRecording("dictate"); }}><Icon name="mic" /></button>
          <button className={`gx-icon-button gx-voice-chat${recording === "talk" ? " is-recording" : ""}`} type="button" aria-label={recording === "talk" ? t("Arrêter et envoyer le message vocal", "Stop and send voice message") : t("Discussion vocale", "Voice chat")} title={t("Discussion vocale", "Voice chat")} disabled={disabled || processing} onClick={() => { void toggleRecording("talk"); }}><Icon name="message" /></button>
          <button className="gx-send-button" type="submit" aria-label={t("Envoyer le message", "Send message")} disabled={disabled || processing || (!value.trim() && !attachment)}><Icon name="arrow-up" /></button>
        </div>
      </div>
    </form>
  );
}
