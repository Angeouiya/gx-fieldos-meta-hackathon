"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkMetricInput } from "@gx/contracts";

import { Icon } from "./components/Icon";
import { archivePayload, localMessages, type ArchiveIndex, type ArchiveConversation } from "./conversation-archive";
import { imageData } from "./image-data";
import { Sidebar } from "./components/Sidebar";
import { Company } from "./pages/Company";
import { Conversation } from "./pages/Conversation";
import { EmptyChat } from "./pages/EmptyChat";
import { Field } from "./pages/Field";
import { FieldOS } from "./pages/FieldOS";
import { Office } from "./pages/Office";
import { Workspace } from "./pages/Workspace";
import { Settings } from "./pages/Settings";
import type { AppView, GXSystemInfo, LocalMessage } from "./types";

export interface GXAppProps {
  runtime?: "web" | "desktop";
  systemInfo?: GXSystemInfo | null;
  chatEndpoint?: string;
  agrixMode?: boolean;
  localFieldReplay?: boolean;
}

class ChatRequestError extends Error {}

function chatHistory(messages: LocalMessage[]) {
  const recent = messages.slice(-20);
  while (recent.length > 1 && (
    recent[0]?.role !== "user"
    || recent.reduce((length, item) => length + item.body.length, 0) > 12_000
  )) {
    recent.shift();
  }
  return recent.map((item) => ({ role: item.role, content: item.body }));
}

export function GXApp({ runtime = "web", systemInfo = null, chatEndpoint = "/api/chat", agrixMode = false, localFieldReplay = false }: GXAppProps) {
  const [language, setLanguage] = useState<"en" | "fr">(agrixMode ? "en" : "fr");
  const english = language === "en";
  const t = (en: string, fr: string) => english ? en : fr;
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("gx.ai.language.v1");
      if (saved === "en" || saved === "fr") setLanguage(saved);
    } catch { /* Browser storage may be unavailable. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    try { window.localStorage.setItem("gx.ai.language.v1", language); } catch { /* Browser storage may be unavailable. */ }
  }, [language]);
  const transcriptionEndpoint = chatEndpoint.replace(/\/chat$/, "/transcribe");
  const workEndpoint = chatEndpoint.replace(/\/chat$/, "/work");
  const legalBaseUrl = runtime === "desktop" && /^https?:\/\//.test(chatEndpoint) ? new URL(chatEndpoint).origin : "";
  const [view, setView] = useState<AppView>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try { setSidebarCollapsed(window.localStorage.getItem("gx.ai.sidebar.collapsed.v1") === "true"); }
    catch { /* Browser storage may be unavailable. */ }
  }, []);
  const toggleSidebarCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try { window.localStorage.setItem("gx.ai.sidebar.collapsed.v1", String(next)); }
    catch { /* Browser storage may be unavailable. */ }
  };
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, LocalMessage[]>>({});
  const [titlesByConversation, setTitlesByConversation] = useState<Record<string, string>>({});
  const [conversationMetadata, setConversationMetadata] = useState<Record<string, { pinned: boolean; archived: boolean }>>({});
  const [accessCode, setAccessCode] = useState("");
  const [agrixConnected, setAgrixConnected] = useState(false);
  const [archiveOwnerId, setArchiveOwnerId] = useState("");
  const [sendingConversationId, setSendingConversationId] = useState<string | null>(null);
  const [errorsByConversation, setErrorsByConversation] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<{ id: number; text: string }>({ id: 0, text: "" });
  const pendingRequest = useRef<AbortController | null>(null);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!agrixMode || runtime !== "web") return;
    let mounted = true;
    void (async () => {
      const session = await fetch("/api/session", { cache: "no-store" });
      const body = await session.json().catch(() => null);
      if (!session.ok || body?.authenticated !== true) return;
      const response = await fetch("/api/field/conversations", { cache: "no-store" });
      if (!response.ok) return;
      const archive = await response.json() as ArchiveIndex;
      if (!mounted || typeof archive.ownerUserId !== "string" || !Array.isArray(archive.conversations) || !Array.isArray(archive.summaries)) return;
      const titles: Record<string, string> = {};
      const messages: Record<string, LocalMessage[]> = {};
      const metadata: Record<string, { pinned: boolean; archived: boolean }> = {};
      for (const summary of [...archive.summaries].reverse()) {
        titles[summary.id] = summary.title;
        metadata[summary.id] = { pinned: summary.pinned === true, archived: summary.archived === true };
      }
      for (const conversation of archive.conversations) messages[conversation.id] = localMessages(conversation);
      setTitlesByConversation(titles);
      setConversationMetadata(metadata);
      setMessagesByConversation(messages);
      setArchiveOwnerId(archive.ownerUserId);
      setAgrixConnected(true);
    })().catch(() => { if (mounted) setAgrixConnected(false); });
    return () => { mounted = false; };
  }, [agrixMode, runtime]);

  const effectiveAccessCode = agrixConnected ? "agrix-session" : accessCode;

  const syncArchive = async (conversationId: string, messages: LocalMessage[]) => {
    if (!agrixMode || runtime !== "web") return;
    const payload = archivePayload(archiveOwnerId, conversationId, messages);
    const response = await fetch("/api/field/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) throw new ChatRequestError(response.status === 410
      ? "This conversation was deleted. Start a new one."
      : "GX could not save this conversation. Try again.");
  };

  useEffect(() => {
    const syncFromHash = () => {
      const requested = window.location.hash.replace("#", "");
      const conversationId = requested.startsWith("conversation/") ? requested.slice("conversation/".length) : "";
      if (conversationId && titlesByConversation[conversationId]) {
        setSelectedConversationId(conversationId);
        setView("conversation");
        return;
      }

      if (requested === "chat" || requested === "office" || requested === "company" || requested === "projects" || requested === "field" || requested === "settings") {
        setView(requested);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [titlesByConversation]);

  const navigate = (nextView: Exclude<AppView, "conversation">) => {
    setView(nextView);
    setSidebarOpen(false);
    if (nextView === "chat") {
      setSelectedConversationId(null);
      setDraft((current) => ({ id: current.id + 1, text: "" }));
    }
    window.history.replaceState(null, "", `#${nextView}`);
  };

  const startPlan = (prompt: string) => {
    setSelectedConversationId(null);
    setDraft((current) => ({ id: current.id + 1, text: prompt }));
    setView("chat");
    setSidebarOpen(false);
    window.history.replaceState(null, "", "#chat");
  };

  const runTask = async (task: string, context: string, images: Array<{ name: string; dataUrl: string }>, measurement?: WorkMetricInput, mode: "analysis" | "scan" = "analysis", signal?: AbortSignal): Promise<string> => {
    if (!effectiveAccessCode.trim()) throw new ChatRequestError(agrixMode ? t("Sign in to AGRIX to start this analysis.", "Connectez-vous à AGRIX pour lancer cette analyse.") : t("Add the local GX.ai test code in Settings to start this analysis.", "Ajoutez le code de test local GX.ai dans Paramètres pour lancer cette analyse."));
    let response: Response;
    try {
      response = await fetch(workEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${effectiveAccessCode.trim()}` },
        body: JSON.stringify({ task, context, images, mode, ...(measurement ? { measurement } : {}) }),
        signal,
      });
    } catch {
      throw new ChatRequestError(t("GX.ai is unavailable. Check your connection and try again.", "GX.ai est indisponible. Vérifiez la connexion puis réessayez."));
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error : t("GX.ai analysis is unavailable.", "L’analyse GX.ai est indisponible.");
      throw new ChatRequestError(detail);
    }
    if (!payload || typeof payload !== "object" || !("report" in payload) || typeof payload.report !== "string" || !payload.report.trim()) {
      throw new ChatRequestError(t("GX.ai returned an empty analysis.", "GX.ai a renvoyé une analyse vide."));
    }
    return payload.report.trim();
  };

  const scanPhoto = async (file: File) => {
    if (sendingConversationId) throw new ChatRequestError(t("Wait for GX.ai to finish its reply.", "Attendez la fin de la réponse GX.ai."));
    if (!effectiveAccessCode.trim()) throw new ChatRequestError(agrixMode ? t("Sign in to AGRIX to analyze this photo.", "Connectez-vous à AGRIX pour analyser cette photo.") : t("Add the local GX.ai test code in Settings to analyze this photo.", "Ajoutez le code de test local GX.ai dans Paramètres pour analyser cette photo."));
    const dataUrl = await imageData(file);
    const conversationId = selectedConversationId ?? `local-${Date.now()}`;
    const title = `${t("Photo analysis", "Analyse photo")} · ${file.name.slice(0, 35)}`;
    if (!selectedConversationId) setTitlesByConversation((current) => ({ ...current, [conversationId]: title }));
    const userMessage: LocalMessage = {
      id: `${conversationId}-${Date.now()}-photo`,
      role: "user",
      body: t(`Analyze photo "${file.name}": identify visible features and suggest useful checks and actions.`, `Analyser la photo « ${file.name} » : identifier les éléments visibles et proposer des vérifications et actions utiles.`),
      imageDataUrl: dataUrl,
      imageName: file.name,
      createdAt: new Date().toISOString(),
    };
    const history = messagesByConversation[conversationId] ?? [];
    setMessagesByConversation((current) => ({ ...current, [conversationId]: [...(current[conversationId] ?? []), userMessage] }));
    setSelectedConversationId(conversationId);
    setView("conversation");
    window.history.replaceState(null, "", `#conversation/${conversationId}`);
    setErrorsByConversation((current) => ({ ...current, [conversationId]: "" }));
    setSendingConversationId(conversationId);
    const controller = new AbortController();
    pendingRequest.current = controller;
    try {
      await syncArchive(conversationId, [...history, userMessage]);
      const report = await runTask(
        t("Agricultural or food visual analysis: describe what is visible, then give cautious hypotheses, checks to perform on site and specific next actions. Do not certify a species, disease or food safety from a photo alone.", "Analyse visuelle agricole ou gastronomique : décris précisément ce qui est visible, puis donne des hypothèses prudentes, les informations à vérifier sur place et des suggestions concrètes adaptées. Ne certifie pas une espèce, une maladie ou la sécurité d'un aliment à partir de la photo seule."),
        t(`User-supplied photo: ${file.name}. It may show a plant, fruit, animal, processed product or dish.`, `Photo fournie par l’utilisateur : ${file.name}. Il peut s’agir d’une plante, d’un fruit, d’un animal, d’un produit transformé ou d’un plat.`),
        [{ name: file.name.slice(0, 150), dataUrl }],
        undefined,
        "scan",
        controller.signal,
      );
      const resultMessage: LocalMessage = { id: `${conversationId}-${Date.now()}-scan`, role: "assistant", body: report, language: english ? "en" : "fr", createdAt: new Date().toISOString() };
      setMessagesByConversation((current) => ({ ...current, [conversationId]: [...(current[conversationId] ?? []), resultMessage] }));
      await syncArchive(conversationId, [...history, userMessage, resultMessage]);
    } catch (error) {
      setErrorsByConversation((current) => ({ ...current, [conversationId]: controller.signal.aborted ? t("Analysis stopped. Your photo remains in the conversation.", "Analyse arrêtée. Votre photo reste dans la conversation.") : error instanceof Error ? error.message : t("The photo could not be analyzed.", "La photo n’a pas pu être analysée.") }));
    } finally {
      if (pendingRequest.current === controller) pendingRequest.current = null;
      setSendingConversationId(null);
    }
  };

  const selectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setView("conversation");
    setSidebarOpen(false);
    window.history.replaceState(null, "", `#conversation/${conversationId}`);
    if (agrixMode && !messagesByConversation[conversationId]) {
      void fetch(`/api/field/conversations?id=${encodeURIComponent(conversationId)}`, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error(t("Could not load this conversation.", "Impossible de charger cette conversation."));
          const data = await response.json() as { conversation: ArchiveConversation };
          setMessagesByConversation((current) => ({ ...current, [conversationId]: localMessages(data.conversation) }));
        })
        .catch(() => setErrorsByConversation((current) => ({ ...current, [conversationId]: t("Could not load this conversation.", "Impossible de charger cette conversation.") })));
    }
  };

  const updateConversation = async (conversationId: string, change: { title?: string; pinned?: boolean; archived?: boolean }) => {
    if (agrixMode && runtime === "web") {
      const response = await fetch("/api/field/conversations", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: conversationId, ...change }),
      });
      if (!response.ok) throw new Error(t("Could not update this conversation.", "Impossible de modifier cette conversation."));
    }
    if (change.title) setTitlesByConversation((current) => ({ ...current, [conversationId]: change.title! }));
    setConversationMetadata((current) => ({ ...current, [conversationId]: {
      pinned: change.pinned ?? (change.archived ? false : current[conversationId]?.pinned ?? false),
      archived: change.archived ?? (change.pinned ? false : current[conversationId]?.archived ?? false),
    } }));
    if (change.archived && selectedConversationId === conversationId) navigate("chat");
  };

  const deleteConversation = async (conversationId: string) => {
    if (agrixMode && runtime === "web") {
      const response = await fetch(`/api/field/conversations?id=${encodeURIComponent(conversationId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(t("Could not delete this conversation.", "Impossible de supprimer cette conversation."));
    }
    setTitlesByConversation((current) => { const next = { ...current }; delete next[conversationId]; return next; });
    setMessagesByConversation((current) => { const next = { ...current }; delete next[conversationId]; return next; });
    setConversationMetadata((current) => { const next = { ...current }; delete next[conversationId]; return next; });
    if (selectedConversationId === conversationId) navigate("chat");
  };

  const submitMessage = async (message: string, speakReply = false) => {
    if (sendingConversationId) return;
    const conversationId = selectedConversationId ?? `local-${Date.now()}`;
    const history = messagesByConversation[conversationId] ?? [];
    if (!selectedConversationId) {
      const title = message.length > 42 ? `${message.slice(0, 42).trimEnd()}…` : message;
      setTitlesByConversation((current) => ({ ...current, [conversationId]: title }));
    }
    const nextMessage: LocalMessage = {
      id: `${conversationId}-${Date.now()}-user`,
      body: message,
      role: "user",
      createdAt: new Date().toISOString(),
    };

    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), nextMessage],
    }));
    setSelectedConversationId(conversationId);
    setView("conversation");
    window.history.replaceState(null, "", `#conversation/${conversationId}`);
    setErrorsByConversation((current) => ({ ...current, [conversationId]: "" }));

    if (!effectiveAccessCode.trim()) {
      setErrorsByConversation((current) => ({
        ...current,
        [conversationId]: agrixMode ? t("Sign in to AGRIX before sending a message.", "Connectez-vous à AGRIX avant d’envoyer un message.") : t("Add the local GX.ai test code in Settings before sending a message.", "Ajoutez le code de test local GX.ai dans Paramètres avant d’envoyer un message."),
      }));
      return;
    }

    setSendingConversationId(conversationId);
    const controller = new AbortController();
    pendingRequest.current = controller;
    try {
      await syncArchive(conversationId, [...history, nextMessage]);
      const response = await fetch(chatEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveAccessCode.trim()}`,
        },
        body: JSON.stringify({
          messages: chatHistory([...history, nextMessage]),
        }),
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = payload && typeof payload === "object" && "error" in payload
          && typeof payload.error === "string" ? payload.error : t("GX.ai is temporarily unavailable.", "GX.ai est indisponible pour le moment.");
        throw new ChatRequestError(detail);
      }
      if (!payload || typeof payload !== "object" || !("reply" in payload)
        || typeof payload.reply !== "string" || !payload.reply.trim()) {
        throw new ChatRequestError(t("GX.ai returned an empty reply. Try again.", "GX.ai a renvoyé une réponse vide. Réessayez."));
      }
      const assistantMessage: LocalMessage = {
        id: `${conversationId}-${Date.now()}-assistant`,
        body: payload.reply.trim(),
        role: "assistant",
        language: english ? "en" : "fr",
        createdAt: new Date().toISOString(),
      };
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: [...(current[conversationId] ?? []), assistantMessage],
      }));
      await syncArchive(conversationId, [...history, nextMessage, assistantMessage]);
      if (speakReply && typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const spoken = new SpeechSynthesisUtterance(payload.reply.trim());
          spoken.lang = english ? "en-US" : "fr-FR";
          window.speechSynthesis.speak(spoken);
        } catch {
          // The text reply remains available when device speech is unavailable.
        }
      }
    } catch (error) {
      setErrorsByConversation((current) => ({
        ...current,
        [conversationId]: controller.signal.aborted
          ? t("Generation stopped. Your message remains in the conversation.", "Génération arrêtée. Votre message reste dans la conversation.")
          : error instanceof ChatRequestError
          ? error.message
          : t("GX.ai is unavailable. Check your connection and try again.", "GX.ai est indisponible. Vérifiez la connexion puis réessayez."),
      }));
    } finally {
      if (pendingRequest.current === controller) pendingRequest.current = null;
      setSendingConversationId(null);
    }
  };

  const stopGeneration = () => pendingRequest.current?.abort();

  const conversationTitle = selectedConversationId
    ? titlesByConversation[selectedConversationId] ?? t("New conversation", "Nouvelle conversation")
    : t("New conversation", "Nouvelle conversation");
  const conversationSummaries = Object.entries(titlesByConversation)
    .map(([id, label]) => ({ id, label, ...conversationMetadata[id] }))
    .reverse().sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  const conversationMessages = selectedConversationId
    ? messagesByConversation[selectedConversationId] ?? []
    : [];

  return (
    <div className={`gx-app${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`} data-runtime={runtime} data-testid="gx-app">
      <button
        className="gx-mobile-menu gx-icon-button"
        type="button"
        aria-label={t("Open navigation", "Ouvrir la navigation")}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen(true)}
      >
        <Icon name="menu" />
      </button>

      <Sidebar
        activeView={view}
        selectedConversationId={selectedConversationId}
        conversations={conversationSummaries}
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapsed={toggleSidebarCollapsed}
        onNavigate={navigate}
        onSelectConversation={selectConversation}
        onUpdateConversation={updateConversation}
        onDeleteConversation={deleteConversation}
        agrixMode={agrixMode}
        language={language}
        onLanguageChange={setLanguage}
      />

      <main className="gx-main">
        {view === "chat" ? (
          <EmptyChat english={english} runtime={runtime} systemInfo={systemInfo} draft={draft} accessCode={effectiveAccessCode} transcriptionEndpoint={transcriptionEndpoint} legalBaseUrl={legalBaseUrl} onSubmit={submitMessage} onScanPhoto={scanPhoto} />
        ) : null}
        {view === "conversation" ? (
          <Conversation
            english={english}
            title={conversationTitle}
            messages={conversationMessages}
            onSubmit={submitMessage}
            onScanPhoto={scanPhoto}
            accessCode={effectiveAccessCode}
            transcriptionEndpoint={transcriptionEndpoint}
            legalBaseUrl={legalBaseUrl}
            isLoading={sendingConversationId === selectedConversationId}
            onStop={stopGeneration}
            error={selectedConversationId ? errorsByConversation[selectedConversationId] || null : null}
          />
        ) : null}
        {view === "office" ? <Office english={english} runtime={runtime} systemInfo={systemInfo} legalBaseUrl={legalBaseUrl} onStartPlan={startPlan} onRunTask={runTask} /> : null}
        {view === "company" ? <Company english={english} legalBaseUrl={legalBaseUrl} onStartPlan={startPlan} onRunTask={runTask} /> : null}
        {view === "projects" ? agrixMode && runtime === "web" ? <FieldOS localReplay={localFieldReplay} english={english} /> : <Workspace id="projects" legalBaseUrl={legalBaseUrl} onStartPlan={startPlan} onRunTask={runTask} english={english} /> : null}
        {view === "field" ? <Field english={english} legalBaseUrl={legalBaseUrl} onStartPlan={startPlan} onRunTask={runTask} /> : null}
        {view === "settings" ? (
          <Settings accessCode={accessCode} agrixMode={agrixMode} agrixConnected={agrixConnected} english={english} legalBaseUrl={legalBaseUrl} onAccessCodeChange={setAccessCode} />
        ) : null}
      </main>
    </div>
  );
}
