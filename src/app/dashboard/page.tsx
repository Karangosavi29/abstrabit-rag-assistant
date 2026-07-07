"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import UploadForm from "@/components/UploadForm";
import DocumentList from "@/components/DocumentList";
import ChatPanel from "@/components/ChatPanel";
import ToolLog from "@/components/ToolLog";

type Workspace = { id: string; name: string };

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    const res = await fetch("/api/workspaces");
    const data = await res.json();
    setWorkspaces(data.workspaces ?? []);
    if (!activeId && data.workspaces?.length) setActiveId(data.workspaces[0].id);
    setLoading(false);
  }, [activeId]);

  const loadWorkspaceData = useCallback(async (id: string) => {
    const [docsRes, chatRes, toolsRes] = await Promise.all([
      fetch(`/api/workspaces/${id}/documents`),
      fetch(`/api/workspaces/${id}/chat`),
      fetch(`/api/workspaces/${id}/tool-calls`)
    ]);
    const [docs, chat, tools] = await Promise.all([
      docsRes.json(),
      chatRes.json(),
      toolsRes.json()
    ]);
    setDocuments(docs.documents ?? []);
    setMessages(
      (chat.messages ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations ?? []
      }))
    );
    setToolCalls(tools.toolCalls ?? []);
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (activeId) loadWorkspaceData(activeId);
  }, [activeId, loadWorkspaceData]);

  async function handleCreateWorkspace(name: string) {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.workspace) {
      setWorkspaces((w) => [...w, data.workspace]);
      setActiveId(data.workspace.id);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-signal/90" />
          <span className="font-mono text-xs text-muted uppercase tracking-wide">
            Partitioned Assistant
          </span>
        </div>
        <button onClick={handleSignOut} className="text-sm text-muted hover:text-danger transition">
          Sign out
        </button>
      </header>

      {workspaces.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <WorkspaceSwitcher
            workspaces={[]}
            activeId={null}
            onSwitch={() => {}}
            onCreate={handleCreateWorkspace}
          />
        </div>
      ) : (
        <>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeId}
            onSwitch={setActiveId}
            onCreate={handleCreateWorkspace}
          />

          {activeId && (
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 p-4 overflow-hidden">
              <section className="flex flex-col gap-4 overflow-y-auto scrollbar-thin">
                <div>
                  <h2 className="text-xs font-mono uppercase text-muted mb-2">Documents</h2>
                  <UploadForm workspaceId={activeId} onUploaded={() => loadWorkspaceData(activeId)} />
                  <div className="mt-3">
                    <DocumentList documents={documents} />
                  </div>
                </div>
              </section>

              <section className="bg-panel/40 border border-line rounded-lg p-4 overflow-hidden flex flex-col">
                <h2 className="text-xs font-mono uppercase text-muted mb-2">
                  Chat -- workspace scoped
                </h2>
                <ChatPanel
                  workspaceId={activeId}
                  messages={messages}
                  onSent={() => loadWorkspaceData(activeId)}
                />
              </section>

              <section className="overflow-y-auto scrollbar-thin">
                <h2 className="text-xs font-mono uppercase text-muted mb-2">Tool call log</h2>
                <ToolLog calls={toolCalls} />
              </section>
            </main>
          )}
        </>
      )}
    </div>
  );
}
