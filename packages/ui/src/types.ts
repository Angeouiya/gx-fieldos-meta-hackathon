import type { Device, WorkMetricInput } from "@gx/contracts";
import type { GXDocumentLanguage } from "./documents/gx-document-language";

export type AppView = "chat" | "conversation" | "office" | "company" | "projects" | "field" | "settings";

export type GXSystemInfo = Pick<
  Device,
  "platform" | "architecture" | "appVersion"
>;

export type RunWorkTask = (
  task: string,
  context: string,
  images: Array<{ name: string; dataUrl: string }>,
  measurement?: WorkMetricInput,
) => Promise<string>;

export interface LocalMessage {
  id: string;
  body: string;
  role: "user" | "assistant";
  language?: GXDocumentLanguage;
  createdAt?: string;
  imageDataUrl?: string;
  imageName?: string;
}
