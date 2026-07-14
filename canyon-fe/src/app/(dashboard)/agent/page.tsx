"use client";

import { ArrowUp, Check, Loader2, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CanyonMark } from "@/components/brand/canyon-mark";
import { MarkdownContent } from "@/components/agent/markdown-content";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getAccessToken } from "@/lib/api";
import type { RoleName } from "@/lib/types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: ToolActivity[];
};

type ToolActivity = {
  id: string;
  name: string;
  status: "running" | "ok" | "error";
  summary?: string;
};

type Suggestion = {
  label: string;
  prompt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const ROLE_SUGGESTIONS: Record<RoleName, Suggestion[]> = {
  administrator: [
    { label: "Show all active projects", prompt: "Show me all active projects right now." },
    { label: "List users", prompt: "List the users in the system." },
    {
      label: "Create a planning project",
      prompt: "Create a project named Agent Demo with status planning.",
    },
  ],
  project_manager: [
    { label: "List projects I manage", prompt: "List the projects I currently manage." },
    {
      label: "Create a task",
      prompt: "On my first project, create a task titled Follow up with stakeholders.",
    },
    { label: "What needs attention?", prompt: "Which of my tasks or project tasks are not done yet?" },
  ],
  team_member: [
    { label: "Show my open tasks", prompt: "Show me all my open tasks." },
    {
      label: "Mark a task in progress",
      prompt: "Find my first open task and mark it in_progress if I am allowed.",
    },
    { label: "Which project am I on?", prompt: "Which projects am I currently a member of?" },
  ],
};

function getRoleLabel(roles: RoleName[]): RoleName {
  if (roles.includes("administrator")) return "administrator";
  if (roles.includes("project_manager")) return "project_manager";
  return "team_member";
}

function formatToolName(name: string) {
  return name.replace(/_/g, " ");
}

export default function AgentPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? ["team_member"];
  const currentRole = getRoleLabel(roles as RoleName[]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveTools, setLiveTools] = useState<ToolActivity[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messageIdRef = useRef(0);

  const suggestions = ROLE_SUGGESTIONS[currentRole];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, liveTools, scrollToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 120;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, [input]);

  function addMessage(role: "user" | "assistant", content: string, tools?: ToolActivity[]) {
    messageIdRef.current += 1;
    const id = `msg-${messageIdRef.current}`;
    const msg: Message = { id, role, content, tools };
    setMessages((prev) => [...prev, msg]);
    return id;
  }

  function updateLastAssistant(content: string, tools?: ToolActivity[]) {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "assistant") {
          copy[i] = {
            ...copy[i],
            content,
            tools: tools ?? copy[i].tools,
          };
          break;
        }
      }
      return copy;
    });
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    setError(null);
    const userText = text.trim();
    addMessage("user", userText);
    setInput("");

    const assistantId = addMessage("assistant", "");
    setIsStreaming(true);
    setLiveTools([]);

    const historyForApi = [
      ...messages,
      { role: "user" as const, content: userText },
    ].map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;

    const toolsAcc: ToolActivity[] = [];
    let accumulated = "";

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: historyForApi }),
        signal: controller.signal,
        credentials: "include",
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventName = "message";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const line of parts) {
          if (line.startsWith("event: ")) {
            eventName = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6).trim();
          if (!data) continue;

          let json: Record<string, unknown>;
          try {
            json = JSON.parse(data) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (eventName === "tool_call") {
            const activity: ToolActivity = {
              id: String(json.id ?? crypto.randomUUID()),
              name: String(json.name ?? "tool"),
              status: "running",
            };
            toolsAcc.push(activity);
            setLiveTools([...toolsAcc]);
            updateLastAssistant(accumulated, [...toolsAcc]);
          } else if (eventName === "tool_result") {
            const id = String(json.id ?? "");
            const idx = toolsAcc.findIndex((t) => t.id === id);
            const next: ToolActivity = {
              id: id || crypto.randomUUID(),
              name: String(json.name ?? "tool"),
              status: json.ok ? "ok" : "error",
              summary: typeof json.summary === "string" ? json.summary : undefined,
            };
            if (idx >= 0) toolsAcc[idx] = next;
            else toolsAcc.push(next);
            setLiveTools([...toolsAcc]);
            updateLastAssistant(accumulated, [...toolsAcc]);
          } else if (eventName === "content") {
            const delta = typeof json.delta === "string" ? json.delta : "";
            if (delta) {
              accumulated += delta;
              updateLastAssistant(accumulated, [...toolsAcc]);
            }
          } else if (eventName === "error") {
            const msg =
              typeof json.message === "string" ? json.message : "Agent error";
            setError(msg);
          }

          eventName = "message";
        }
      }

      if (!accumulated.trim() && toolsAcc.length === 0) {
        updateLastAssistant("…", toolsAcc);
      } else {
        updateLastAssistant(accumulated || "Done.", toolsAcc);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      const msg =
        e instanceof Error ? e.message : "Something went wrong talking to the agent.";
      setError(msg);
      setMessages((prev) =>
        prev.filter((m) => !(m.id === assistantId && !m.content && !m.tools?.length))
      );
    } finally {
      setIsStreaming(false);
      setLiveTools([]);
      abortRef.current = null;
    }
  }

  function handleSend() {
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function applySuggestion(s: Suggestion) {
    sendMessage(s.prompt);
  }

  function startNewChat() {
    setMessages([]);
    setInput("");
    setError(null);
    setLiveTools([]);
    if (abortRef.current) abortRef.current.abort();
  }

  const boundaryText = `This agent can act for you as ${currentRole.replace(/_/g, " ")} — RBAC is enforced on every action.`;

  return (
    <div className="-mx-4 -mt-14 flex h-[calc(100dvh)] flex-col pt-14 md:-mx-8 md:-mt-8 md:h-dvh md:pt-0">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <CanyonMark size="sm" />
          <div>
            <div className="text-sm font-semibold tracking-tight">Agent</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              Role-aware assistant with tools
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-sm border border-border bg-muted px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {currentRole.replace(/_/g, " ")}
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={startNewChat}>
              New chat
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-8 md:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CanyonMark size="lg" />
              <h1 className="mt-5 text-3xl font-semibold tracking-tight">
                What are you working on?
              </h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                I can look up and change projects, tasks, and (if you&apos;re an admin) users —
                only within your role.
              </p>

              <div className="mt-8 grid w-full max-w-xl gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="agent-suggestion flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3 text-left text-sm active:bg-secondary"
                  >
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 text-[15px] leading-relaxed ${
                    m.role === "user"
                      ? "agent-bubble-user whitespace-pre-wrap bg-primary text-primary-foreground"
                      : "agent-bubble-assistant bg-muted text-foreground"
                  }`}
                >
                  {m.role === "assistant" && m.tools && m.tools.length > 0 && (
                    <div className="mb-2 flex flex-col gap-1.5">
                      {m.tools.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-start gap-2 rounded-sm border border-border/60 bg-background/50 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {t.status === "running" && (
                            <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin" />
                          )}
                          {t.status === "ok" && (
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                          )}
                          {t.status === "error" && (
                            <X className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-foreground/80">
                              {formatToolName(t.name)}
                            </div>
                            {t.summary && (
                              <div className="truncate text-muted-foreground/80">{t.summary}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.role === "assistant" ? (
                    <MarkdownContent content={m.content || (isStreaming ? "" : "")} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))
          )}

          {isStreaming && liveTools.length === 0 && (
            <div className="flex justify-start">
              <div className="agent-bubble-assistant max-w-[80%] bg-muted px-4 py-3 text-sm text-muted-foreground">
                Canyon Agent is thinking…
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background px-4 pb-6 pt-4 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="agent-boundary mb-2 px-1 font-mono text-[10px] uppercase text-muted-foreground/70">
            {boundaryText}
          </div>

          <div className="agent-composer flex items-end gap-2 rounded-md border border-border bg-card px-3 py-2">
            <button
              type="button"
              className="mb-1 flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => textareaRef.current?.focus()}
              aria-label="Add attachment (not yet supported)"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Canyon Agent…"
              className="max-h-[140px] flex-1 resize-none bg-transparent py-2 text-[15px] placeholder:text-muted-foreground focus:outline-none"
              rows={1}
              disabled={isStreaming}
            />

            <Button
              size="icon"
              className="mb-0.5 h-9 w-9 rounded-sm"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>

          <p className="mt-2 px-1 text-center font-mono text-[10px] text-muted-foreground/50">
            Press Enter to send · Shift + Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}
