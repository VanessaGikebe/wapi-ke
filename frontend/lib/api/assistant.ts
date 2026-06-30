import { apiFetch } from "@/lib/api/client";

export interface AssistantResponse {
  session_id: string;
  reply: string;
  suggested_category: string | null;
  suggested_filters: Record<string, unknown> | null;
}

/** Send one message to the AI assistant; `sessionId` is null on the first turn. */
export async function sendAssistantMessage(
  message: string,
  sessionId: string | null,
): Promise<AssistantResponse> {
  return apiFetch<AssistantResponse>("/assistant/message", {
    method: "POST",
    body: { message, session_id: sessionId },
  });
}
