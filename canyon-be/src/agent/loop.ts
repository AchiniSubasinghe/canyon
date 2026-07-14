import type { Response } from "express";
import { config } from "../config.js";
import { AppError } from "../middleware/errorHandler.js";
import { executeTool, summarizeToolResult } from "./handlers.js";
import { buildSystemPrompt } from "./prompt.js";
import { AGENT_TOOLS } from "./tools.js";
import type {
  AgentUser,
  ChatMessage,
  LlmMessage,
  OpenAiToolCall,
  SseEventName,
} from "./types.js";

const MAX_TOOL_ROUNDS = 8;
const MAX_RESULT_CHARS = 12_000;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function writeSse(res: Response, event: SseEventName, data: unknown) {
  if (res.writableEnded) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function truncateResult(payload: unknown): string {
  const text = JSON.stringify(payload);
  if (text.length <= MAX_RESULT_CHARS) return text;
  return JSON.stringify({
    ok: false,
    error: "Tool result too large; narrow filters or use pagination",
    truncated: true,
    preview: text.slice(0, 500),
  });
}

function parseToolArgs(raw: string): unknown {
  if (!raw || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { __parse_error: true, raw };
  }
}

async function callDeepSeek(messages: LlmMessage[], stream: boolean) {
  if (!config.DEEPSEEK_API_KEY) {
    throw new AppError(500, "Canyon Agent is not configured (missing DEEPSEEK_API_KEY)");
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      tools: AGENT_TOOLS,
      tool_choice: "auto",
      stream,
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new AppError(502, `Deepseek error: ${response.status} ${text}`);
  }

  return response;
}

async function streamFinalContent(res: Response, messages: LlmMessage[]) {
  const upstream = await callDeepSeek(messages, true);
  if (!upstream.body) {
    throw new AppError(502, "Deepseek error: empty stream body");
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;

      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          writeSse(res, "content", { delta });
        }
      } catch {
        // ignore partial chunks
      }
    }
  }
}

export async function runAgentLoop(
  user: AgentUser,
  clientMessages: ChatMessage[],
  res: Response
): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const messages: LlmMessage[] = [
    { role: "system", content: buildSystemPrompt(user) },
    ...clientMessages.map((m) => ({ role: m.role, content: m.content }) as LlmMessage),
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const upstream = await callDeepSeek(messages, false);
      const body = (await upstream.json()) as {
        choices?: Array<{
          finish_reason?: string;
          message?: {
            role?: string;
            content?: string | null;
            tool_calls?: OpenAiToolCall[];
          };
        }>;
      };

      const choice = body.choices?.[0];
      const message = choice?.message;
      if (!message) {
        throw new AppError(502, "Deepseek error: empty response");
      }

      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length > 0) {
        messages.push({
          role: "assistant",
          content: message.content ?? null,
          tool_calls: toolCalls,
        });

        for (const call of toolCalls) {
          const name = call.function?.name ?? "unknown";
          const rawArgs = call.function?.arguments ?? "{}";
          let args = parseToolArgs(rawArgs);

          writeSse(res, "tool_call", {
            id: call.id,
            name,
            arguments: typeof args === "object" ? args : { raw: rawArgs },
          });

          let result;
          if (args && typeof args === "object" && "__parse_error" in (args as object)) {
            result = {
              ok: false as const,
              error: "Invalid tool arguments JSON",
              statusCode: 400,
            };
          } else {
            result = await executeTool(name, args, user);
          }

          writeSse(res, "tool_result", {
            id: call.id,
            name,
            ok: result.ok,
            summary: summarizeToolResult(result),
          });

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: truncateResult(result),
          });
        }

        continue;
      }

      // Final text: stream a dedicated request for better UX, or use non-stream content.
      const content = message.content ?? "";
      if (content) {
        // Non-stream final content from this round — emit as one content delta
        // (DeepSeek already returned full message without tools).
        writeSse(res, "content", { delta: content });
      } else {
        // No content and no tools — try streaming a follow-up
        await streamFinalContent(res, messages);
      }

      writeSse(res, "done", {});
      res.end();
      return;
    }

    writeSse(res, "error", {
      message: "Agent stopped: too many tool rounds. Try a more specific request.",
    });
    writeSse(res, "done", {});
    res.end();
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Agent failed";
    if (!res.writableEnded) {
      writeSse(res, "error", { message });
      writeSse(res, "done", {});
      res.end();
    }
  }
}
