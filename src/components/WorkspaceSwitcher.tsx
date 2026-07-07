"use client";

import { useState } from "react";

type Workspace = { id: string; name: string };

export default function WorkspaceSwitcher({
  workspaces,
  activeId,
  onSwitch,
  onCreate
}: {
  workspaces: Workspace[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="border-b border-line bg-panel/60">
      <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto scrollbar-thin">
        {workspaces.map((ws) => {
          const active = ws.id === activeId;
          return (
            <button
              key={ws.id}
              onClick={() => onSwitch(ws.id)}
              title={`Workspace ${ws.id}`}
              className={`relative px-4 py-2 text-sm rounded-t-md border-t border-x whitespace-nowrap transition ${
                active
                  ? "bg-ink border-line text-signal font-medium"
                  : "bg-transparent border-transparent text-muted hover:text-white"
              }`}
            >
              <span className="font-mono text-[10px] text-muted mr-1.5">▧</span>
              {ws.name}
              {active && (
                <span className="absolute left-0 right-0 -bottom-px h-px bg-signal" />
              )}
            </button>
          );
        })}

        {creating ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              await onCreate(name.trim());
              setName("");
              setCreating(false);
            }}
            className="flex items-center gap-1 px-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => !name && setCreating(false)}
              placeholder="Workspace name"
              className="bg-ink border border-line rounded px-2 py-1 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-signal"
            />
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-2 text-sm text-muted hover:text-signal2 whitespace-nowrap"
          >
            + New workspace
          </button>
        )}
      </div>
      <p className="px-4 pb-2 pt-1 text-[11px] text-muted font-mono">
        Every workspace's chunks live in one shared table -- the tab you're on is the only
        partition the assistant can see.
      </p>
    </div>
  );
}
