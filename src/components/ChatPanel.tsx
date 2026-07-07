"use client";

import { useState } from "react";

type Citation = {
  documentId: string;
  filename: string;
  chunkIndex: number;
  similarity: number;
  snippet: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export default function ChatPanel({
  workspaceId,
  messages,
  onSent
}: {
  workspaceId: string;
  messages: Message[];
  onSent: () => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [openDebug, setOpenDebug] = useState<number | null>(null);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    setBusy(true);
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, message: text })
    });
    setBusy(false);
    onSent();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask a question grounded in this workspace's documents.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={m.id ?? i}
            className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-signal2/15 text-white"
                : "bg-panel border border-line"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 border-t border-line pt-2">
                <button
                  onClick={() => setOpenDebug(openDebug === i ? null : i)}
                  className="text-[11px] font-mono text-signal2 hover:underline"
                >
                  {openDebug === i ? "hide" : "show"} {m.citations.length} source
                  {m.citations.length > 1 ? "s" : ""}
                </button>
                {openDebug === i && (
                  <ul className="mt-1.5 space-y-1.5">
                    {m.citations.map((c, ci) => (
                      <li key={ci} className="text-[11px] font-mono bg-ink/60 rounded px-2 py-1">
                        <span className="text-signal">
                          [{c.filename} #{c.chunkIndex}]
                        </span>{" "}
                        <span className="text-muted">
                          sim {c.similarity?.toFixed(3)}
                        </span>
                        <p className="text-muted mt-0.5">{c.snippet}...</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-line mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about this workspace's documents, or ask it to save a task / send a summary..."
          className="flex-1 bg-panel border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal/50"
        />
        <button
          onClick={send}
          disabled={busy}
          className="bg-signal text-ink text-sm font-medium rounded-md px-4 py-2 disabled:opacity-60"
        >
          {busy ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
