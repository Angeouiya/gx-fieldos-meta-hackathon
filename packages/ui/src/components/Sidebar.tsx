import { useState, type FormEvent } from "react";
import type { AppView } from "../types";
import { Icon, type IconName } from "./Icon";

interface SidebarProps {
  activeView: AppView;
  selectedConversationId: string | null;
  conversations: ReadonlyArray<{ id: string; label: string; pinned?: boolean; archived?: boolean }>;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
  onNavigate: (view: Exclude<AppView, "conversation">) => void;
  onSelectConversation: (conversationId: string) => void;
  onUpdateConversation: (conversationId: string, change: { title?: string; pinned?: boolean; archived?: boolean }) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  agrixMode?: boolean;
  language?: "en" | "fr";
  onLanguageChange?: (language: "en" | "fr") => void;
}

const navigation: ReadonlyArray<{
  id: "office" | "company" | "projects" | "field";
  label: string;
  icon: IconName;
}> = [
  { id: "office", label: "Workspace", icon: "briefcase" },
  { id: "company", label: "Business", icon: "building" },
  { id: "projects", label: "Projects", icon: "clipboard" },
  { id: "field", label: "Field", icon: "sprout" },
];

export function Sidebar({
  activeView,
  selectedConversationId,
  conversations,
  open,
  collapsed,
  onClose,
  onToggleCollapsed,
  onNavigate,
  onSelectConversation,
  onUpdateConversation,
  onDeleteConversation,
  agrixMode = false,
  language = "en",
  onLanguageChange,
}: SidebarProps) {
  const english = language === "en";
  const t = (en: string, fr: string) => english ? en : fr;
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const archivedCount = conversations.filter((item) => item.archived).length;
  const visibleConversations = conversations.filter((item) => Boolean(item.archived) === showArchived);
  const update = async (id: string, change: { title?: string; pinned?: boolean; archived?: boolean }) => {
    try {
      setActionError(null);
      await onUpdateConversation(id, change);
      setEditingId(null);
      setOpenMenuId(null);
    } catch (error) { setActionError({ id, message: error instanceof Error ? error.message : "Unable to edit." }); }
  };
  const saveTitle = (event: FormEvent, id: string) => {
    event.preventDefault();
    const title = editTitle.trim();
    if (title) void update(id, { title });
  };
  const remove = async (id: string) => {
    try {
      setActionError(null);
      await onDeleteConversation(id);
      setDeleteId(null);
      setOpenMenuId(null);
    } catch (error) { setActionError({ id, message: error instanceof Error ? error.message : "Unable to delete." }); }
  };
  return (
    <>
      {open ? (
        <button
          className="gx-sidebar-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`gx-sidebar${open ? " is-open" : ""}${collapsed ? " is-collapsed" : ""}`}
        aria-label="Main navigation"
      >
        <div className="gx-sidebar-top">
          <div className="gx-sidebar-heading">
            <button
              className="gx-logo"
              type="button"
              onClick={() => onNavigate("chat")}
              aria-label="New conversation GX.ai"
              title="GX.ai"
            >
              <span className="gx-logo-word">GX.ai</span><span className="gx-logo-mark">GX</span>
            </button>
            <button className="gx-sidebar-collapse" type="button" onClick={onToggleCollapsed} aria-label={collapsed ? t("Expand sidebar", "Déplier la barre latérale") : t("Collapse sidebar", "Réduire la barre latérale")} title={collapsed ? t("Expand sidebar", "Déplier la barre latérale") : t("Collapse sidebar", "Réduire la barre latérale")}>
              <Icon name={collapsed ? "chevron-right" : "chevron-left"} />
            </button>
            <button className="gx-sidebar-close" type="button" onClick={onClose} aria-label={t("Close navigation", "Fermer la navigation")}>
              <Icon name="close" />
            </button>
          </div>

          <nav className="gx-primary-nav" aria-label="GX.ai workspaces">
            <button
              className={`gx-nav-item${activeView === "chat" || activeView === "conversation" ? " is-active" : ""}`}
              type="button"
              aria-label={t("Chat with GX.ai", "Discuter avec GX.ai")}
              aria-current={activeView === "chat" || activeView === "conversation" ? "page" : undefined}
              onClick={() => onNavigate("chat")}
              title={t("Chat with GX.ai", "Discuter avec GX.ai")}
            >
              <Icon name="message" />
              <span>{t("Chat with GX.ai", "Discuter avec GX.ai")}</span>
            </button>
            {navigation.map((item) => (
              <button
                className={`gx-nav-item${activeView === item.id ? " is-active" : ""}`}
                key={item.id}
                type="button"
                aria-label={item.id === "projects" ? agrixMode ? t("Scans & projects", "Scans et projets") : t("Projects", "Projets") : item.id === "office" ? t("Workspace", "Bureau") : item.id === "company" ? t("Business", "Entreprise") : t("Field", "Terrain")}
                aria-current={activeView === item.id ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
                title={item.id === "projects" ? agrixMode ? t("Scans & projects", "Scans et projets") : t("Projects", "Projets") : item.id === "office" ? t("Workspace", "Bureau") : item.id === "company" ? t("Business", "Entreprise") : t("Field", "Terrain")}
              >
                <Icon name={item.icon} />
                <span>{item.id === "projects" ? agrixMode ? t("Scans & projects", "Scans et projets") : t("Projects", "Projets") : item.id === "office" ? t("Workspace", "Bureau") : item.id === "company" ? t("Business", "Entreprise") : t("Field", "Terrain")}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="gx-sidebar-divider" />

        <div className="gx-conversations">
          <div className="gx-section-label-row">
            <span>{agrixMode ? t("Account conversations", "Conversations du compte") : t("This session", "Cette session")}</span>
            <button
              className="gx-small-icon"
              type="button"
              aria-label={t("New conversation", "Nouvelle conversation")}
              onClick={() => onNavigate("chat")}
            >
              <Icon name="plus" />
            </button>
          </div>

          <nav aria-label={t("Recent conversations", "Conversations récentes")}>
            {visibleConversations.length === 0 ? <p className="gx-conversations-empty">{showArchived ? t("No archived conversations.", "Aucune conversation archivée.") : t("No conversations yet.", "Aucune conversation.")}</p> : null}
            {visibleConversations.map((conversation) => {
              const selected =
                activeView === "conversation" &&
                selectedConversationId === conversation.id;

              return (
                <div className="gx-conversation-entry" key={conversation.id}>
                  <div className="gx-conversation-row">
                    <button className={`gx-conversation-link${selected ? " is-active" : ""}`} type="button" aria-current={selected ? "page" : undefined} title={conversation.label} onClick={() => { setOpenMenuId(null); onSelectConversation(conversation.id); }}>
                      {conversation.pinned ? "● " : ""}{conversation.label}
                    </button>
                    {agrixMode && <button className="gx-conversation-options" type="button" aria-label={`${t("Options for", "Options de")} ${conversation.label}`} aria-expanded={openMenuId === conversation.id} aria-controls={`gx-conversation-menu-${conversation.id}`} onClick={() => { setOpenMenuId((current) => current === conversation.id ? null : conversation.id); setActionError(null); }}>⋯</button>}
                  </div>
                  {agrixMode && openMenuId === conversation.id && <div className="gx-conversation-menu" id={`gx-conversation-menu-${conversation.id}`} role="group" aria-label={`${t("Actions for", "Actions de")} ${conversation.label}`}>
                    <button type="button" aria-label={`${t("Rename", "Renommer")} ${conversation.label}`} onClick={() => { setEditingId(conversation.id); setEditTitle(conversation.label); setOpenMenuId(null); setActionError(null); }}><Icon name="pencil" />{t("Rename", "Renommer")}</button>
                    <button type="button" aria-label={`${conversation.pinned ? t("Unpin", "Désépingler") : t("Pin", "Épingler")} ${conversation.label}`} onClick={() => void update(conversation.id, { pinned: !conversation.pinned })}><Icon name="pin" />{conversation.pinned ? t("Unpin", "Désépingler") : t("Pin", "Épingler")}</button>
                    <button type="button" aria-label={`${conversation.archived ? t("Restore", "Restaurer") : t("Archive", "Archiver")} ${conversation.label}`} onClick={() => void update(conversation.id, { archived: !conversation.archived })}><Icon name="archive" />{conversation.archived ? t("Restore", "Restaurer") : t("Archive", "Archiver")}</button>
                    <button type="button" aria-label={`${t("Delete", "Supprimer")} ${conversation.label}`} onClick={() => { setDeleteId(conversation.id); setOpenMenuId(null); setActionError(null); }}><Icon name="trash" />{t("Delete", "Supprimer")}</button>
                  </div>}
                  {editingId === conversation.id && <div className="gx-conversation-menu"><form onSubmit={(event) => saveTitle(event, conversation.id)}><input aria-label={t("New conversation name", "Nouveau nom de conversation")} maxLength={80} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /><button type="submit">{t("Save", "Enregistrer")}</button><button type="button" onClick={() => setEditingId(null)}>{t("Cancel", "Annuler")}</button></form></div>}
                  {(deleteId === conversation.id || actionError?.id === conversation.id) && <div className="gx-conversation-menu">
                    {deleteId === conversation.id && <div className="gx-conversation-delete" role="alertdialog" aria-label={t("Confirm deletion", "Confirmer la suppression")}><p>{t("This conversation and its messages will be removed from the account. Related temporary files may also be deleted.", "Cette conversation et ses messages seront supprimés du compte. Les fichiers temporaires associés peuvent aussi être supprimés.")}</p><button type="button" onClick={() => setDeleteId(null)}>{t("Keep", "Conserver")}</button><button type="button" onClick={() => void remove(conversation.id)}>{t("Delete permanently", "Supprimer définitivement")}</button></div>}
                    {actionError?.id === conversation.id && <p role="alert">{actionError.message}</p>}
                  </div>}
                </div>
              );
            })}
          </nav>
          {agrixMode && (archivedCount > 0 || showArchived) && <button className="gx-conversation-archive-toggle" type="button" onClick={() => { setShowArchived(!showArchived); setEditingId(null); setOpenMenuId(null); }}>{showArchived ? t("Back to conversations", "Retour aux conversations") : `${t("Archives", "Archives")} (${archivedCount})`}</button>}
        </div>

        <div className="gx-sidebar-bottom">
          <div className="gx-language-switch" role="group" aria-label={t("Interface language", "Langue de l’interface")}>
            <button type="button" lang="en" aria-pressed={english} onClick={() => onLanguageChange?.("en")}>EN</button>
            <button type="button" lang="fr" aria-pressed={!english} onClick={() => onLanguageChange?.("fr")}>FR</button>
          </div>
          <button
            className={`gx-nav-item${activeView === "settings" ? " is-active" : ""}`}
            type="button"
            aria-current={activeView === "settings" ? "page" : undefined}
            onClick={() => onNavigate("settings")}
          >
            <Icon name="settings" />
            <span>{t("Settings", "Paramètres")}</span>
          </button>
          <button
            className="gx-profile"
            type="button"
            onClick={() => onNavigate("settings")}
            aria-label={agrixMode ? t("Open AGRIX account settings", "Ouvrir les paramètres du compte AGRIX") : t("Open local prototype settings", "Ouvrir les paramètres du prototype local")}
          >
            <span className="gx-avatar" aria-hidden="true">{agrixMode ? "AG" : "GX"}</span>
            <span>
              <strong>{agrixMode ? t("AGRIX account", "Compte AGRIX") : t("Local prototype", "Prototype local")}</strong>
              <small>{agrixMode ? t("Account session", "Session du compte") : t("Development mode", "Mode développement")}</small>
            </span>
          </button>
        </div>
      </aside>

    </>
  );
}
