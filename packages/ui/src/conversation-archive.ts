import type { LocalMessage } from "./types";

export type ArchiveConversation = {
  id: string;
  title: string;
  messages: { id: string; role: "user" | "assistant"; content: string; createdAt: number; language?: "en" | "fr"; attachments?: { name: string }[] }[];
  createdAt: number;
  pinned?: boolean;
  archived?: boolean;
};

export type ArchiveIndex = {
  ownerUserId: string;
  conversations: ArchiveConversation[];
  summaries: { id: string; title: string; pinned?: boolean; archived?: boolean }[];
};

export function localMessages(conversation: ArchiveConversation): LocalMessage[] {
  return conversation.messages.map((message) => ({
    id: message.id,
    role: message.role,
    body: message.content,
    ...(message.role === "assistant" && (message.language === "en" || message.language === "fr") ? { language: message.language } : {}),
    createdAt: new Date(message.createdAt).toISOString(),
    ...(message.attachments?.[0]?.name ? { imageName: message.attachments[0].name } : {}),
  }));
}

export function archivePayload(ownerUserId: string, id: string, messages: LocalMessage[]) {
  const current = messages.slice(-40);
  const createdAt = Date.parse(current[0]?.createdAt ?? "");
  if (!ownerUserId || !/^[a-zA-Z0-9-]{8,80}$/.test(id) || !current.length || !Number.isFinite(createdAt)) {
    throw new Error("Conversation GX invalide.");
  }
  return {
    ownerUserId,
    id,
    createdAt,
    removedMessageIds: [],
    messages: current.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.body,
      createdAt: Date.parse(message.createdAt ?? ""),
      ...(message.role === "assistant" && (message.language === "en" || message.language === "fr") ? { language: message.language } : {}),
      ...(message.imageName ? { attachments: [{ name: message.imageName.slice(0, 100) }] } : {}),
    })),
  };
}
