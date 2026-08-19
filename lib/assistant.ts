export type AssistantRole = "user" | "assistant";

export type AssistantMessage = {
  id: string;
  role: AssistantRole;
  content: string;
  createdAt: string;
};

export type AssistantMessageRow = {
  id: string;
  role: AssistantRole;
  content: string;
  created_at: string;
};

export type TaskSuggestion = { type: "task"; title: string; description: string; dueAt: string };
export type EventSuggestion = { type: "event"; title: string; description: string; location: string; eventAt: string; eventEndAt: string | null; reminders: string[] };
export type TransactionSuggestion = { type: "transaction"; transactionType: "income" | "expense"; amount: number; description: string; transactionDate: string; pocketId: string; categoryId: string };
export type AssistantSuggestion = TaskSuggestion | EventSuggestion | TransactionSuggestion;

export type AssistantStreamEvent =
  | { type: "text"; value: string }
  | { type: "suggestion"; value: AssistantSuggestion };

export function assistantMessageFromRow(row: AssistantMessageRow): AssistantMessage {
  return { id: row.id, role: row.role, content: row.content, createdAt: row.created_at };
}
