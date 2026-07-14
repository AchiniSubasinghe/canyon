import type { RoleName } from "../lib/roles.js";

export interface AgentUser {
  id: number;
  email: string;
  name: string;
  roles: RoleName[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolSuccess {
  ok: true;
  data: unknown;
}

export interface ToolFailure {
  ok: false;
  error: string;
  statusCode?: number;
  details?: unknown;
}

export type ToolResult = ToolSuccess | ToolFailure;

export type SseEventName = "tool_call" | "tool_result" | "content" | "done" | "error";

export interface OpenAiToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type LlmMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
