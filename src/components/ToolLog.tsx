"use client";

type ToolCall = {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  status: "success" | "error";
  result: unknown;
  error: string | null;
  created_at: string;
};

export default function ToolLog({ calls }: { calls: ToolCall[] }) {
  if (calls.length === 0) {
    return <p className="text-sm text-muted">No tool calls yet in this workspace.</p>;
  }

  return (
    <ul className="space-y-2">
      {calls.map((c) => (
        <li key={c.id} className="bg-panel border border-line rounded-md px-3 py-2 text-xs font-mono">
          <div className="flex items-center justify-between mb-1">
            <span className="text-signal2">{c.tool_name}</span>
            <span className={c.status === "success" ? "text-signal" : "text-danger"}>
              {c.status}
            </span>
          </div>
          <div className="text-muted break-all">{JSON.stringify(c.arguments)}</div>
          {c.error && <div className="text-danger mt-1">{c.error}</div>}
        </li>
      ))}
    </ul>
  );
}
