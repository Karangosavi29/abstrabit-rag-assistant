"use client";

type Doc = { id: string; filename: string; status: string; created_at: string };

export default function DocumentList({ documents }: { documents: Doc[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted">No documents yet. Upload one to get started.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((d) => (
        <li
          key={d.id}
          className="flex items-center justify-between bg-panel border border-line rounded-md px-3 py-2 text-sm"
        >
          <span className="truncate">{d.filename}</span>
          <span
            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
              d.status === "ready"
                ? "bg-signal/15 text-signal"
                : d.status === "failed"
                ? "bg-danger/15 text-danger"
                : "bg-warn/15 text-warn"
            }`}
          >
            {d.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
