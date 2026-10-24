import type { Source } from "./api";

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  fallback?: boolean;
};

/**
 * The current conversation, in memory only (lost on reload, never stored in
 * the browser). The session token is the API's opaque handle; the model's own
 * session id never reaches the browser.
 */
export type Conversation = {
  messages: ChatMessage[];
  sessionToken?: string;
  remaining?: number;
};

export const emptyConversation = (): Conversation => ({ messages: [] });
