"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Search, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import type { AdvisorMessage } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold text-content">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1" />;
        const bullet = /^([•\-*])\s+/.test(line);
        const content = line.replace(/^([•\-*])\s+/, "");
        return (
          <p
            key={index}
            className={cn(
              "text-[0.83rem] leading-6 text-muted",
              bullet && "relative pl-3.5 before:absolute before:left-0 before:top-[0.6rem] before:h-1 before:w-1 before:rounded-full before:bg-brand"
            )}
          >
            <Bold text={content} />
          </p>
        );
      })}
    </div>
  );
}

const SUGGESTIONS = [
  "Which programmes fit my profile and budget?",
  "Compare my top three options",
  "What should I do in the next 90 days?",
  "Is my shortlist realistic for the UK?",
];

export function AdvisorChat({
  initialMessages,
  learnerName,
  provider,
  model,
}: {
  initialMessages: AdvisorMessage[];
  learnerName: string;
  provider: "gemini" | "rules";
  model: string;
}) {
  const [messages, setMessages] = useState<AdvisorMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setInput("");

    const optimistic: AdvisorMessage = {
      id: `temp-${Date.now()}`,
      learnerId: "self",
      role: "user",
      content: value,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The advisor could not answer just now.");
        return;
      }
      setMessages((prev) => [...prev, data.message as AdvisorMessage]);
      if (data.fallbackReason) setNotice(data.fallbackReason);
    } catch {
      setError("The advisor could not be reached. Check your connection and try again.");
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-card lg:h-[calc(100dvh-13.5rem)] lg:min-h-[36rem]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brandSoft text-brand">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-content">Northstar advisor</p>
            <p className="text-[0.65rem] text-muted">
              {provider === "gemini" ? "Gemini with catalogue tools" : "Local rules engine"}
              {provider === "gemini" ? ` · ${model}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={provider === "gemini" ? "brand" : "outline"} dot>
            {provider === "gemini" ? "Live model" : "No model key"}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        {messages.length === 0 && (
          <div className="mb-5 rounded-xl border border-line bg-panel2/40 p-4">
            <p className="text-sm leading-6 text-muted">
              Hello {learnerName.split(" ")[0]}. Ask me about programmes, fees,
              eligibility or the next step in your plan. I search the live catalogue
              before I answer, and I will tell you when something needs verification.
            </p>
          </div>
        )}

        <ul className="space-y-5">
          {messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "flex gap-2.5",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brandSoft text-brand">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[78%]",
                  message.role === "user"
                    ? "rounded-br-md bg-brand text-brandContrast"
                    : "rounded-bl-md border border-line bg-panel2/40"
                )}
              >
                {message.role === "assistant" ? (
                  <RichText text={message.content} />
                ) : (
                  <p className="text-[0.83rem] leading-6">{message.content}</p>
                )}

                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2">
                    {message.toolCalls.map((call, index) => (
                      <span
                        key={`${call.name}-${index}`}
                        className="inline-flex items-center gap-1 rounded-full bg-panel px-2 py-0.5 text-[0.6rem] text-muted"
                      >
                        <Wrench className="h-2.5 w-2.5" />
                        {call.summary}
                      </span>
                    ))}
                  </div>
                )}

                {message.guardrail?.redacted && (
                  <p className="mt-2 flex items-center gap-1 text-[0.6rem] text-clay-600 dark:text-clay-300">
                    <ShieldCheck className="h-3 w-3" /> Guardrail applied — unsupported
                    promise language removed.
                  </p>
                )}
              </div>
            </li>
          ))}

          {busy && (
            <li className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brandSoft text-brand">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-panel2/40 px-4 py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                <span className="text-[0.75rem] text-muted">
                  Checking the catalogue…
                </span>
              </div>
            </li>
          )}
        </ul>
        <div ref={endRef} />
      </div>

      {(error || notice) && (
        <div className="border-t border-line px-4 py-2 text-[0.68rem] sm:px-5">
          {error && <p className="text-clay-600 dark:text-clay-300">{error}</p>}
          {notice && !error && <p className="text-muted">{notice} Answers use the local rules engine.</p>}
        </div>
      )}

      <div className="border-t border-line bg-panel p-3 sm:p-4">
        {messages.length < 3 && (
          <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                disabled={busy}
                className="focus-ring shrink-0 rounded-full border border-line bg-panel2/50 px-3 py-1.5 text-[0.68rem] font-medium text-muted transition-colors hover:border-lineStrong hover:text-content disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-faint" />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={1200}
              placeholder="Ask about programmes, fees, eligibility or your next step…"
              className="max-h-32 min-h-[2.75rem] w-full resize-none rounded-xl border border-lineStrong bg-canvas py-2.5 pl-9 pr-3 text-sm leading-6 text-content placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brandContrast transition-colors hover:bg-brand/90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </form>
        <p className="mt-2 text-[0.6rem] leading-4 text-faint">
          Advisor responses are guidance only and can be wrong. Verify fees and
          eligibility with institutions. Your counsellor remains the decision-maker.
        </p>
      </div>
    </div>
  );
}
