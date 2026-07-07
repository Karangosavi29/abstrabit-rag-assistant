import type { SupabaseClient } from "@supabase/supabase-js";

type ToolResult = { status: "success" | "error"; result?: unknown; error?: string };

const KNOWN_TOOLS = new Set(["save_task", "send_summary"]);


export async function validateAndRunTool(
  toolName: string,
  rawArgs: unknown,
  workspaceId: string,
  supabase: SupabaseClient
): Promise<ToolResult> {
  if (!KNOWN_TOOLS.has(toolName)) {
    return { status: "error", error: `Unknown tool "${toolName}" -- refusing to execute.` };
  }

  try {
    if (toolName === "save_task") {
      const args = rawArgs as Record<string, unknown>;
      if (typeof args?.title !== "string" || !args.title.trim()) {
        return { status: "error", error: "save_task requires a non-empty string 'title'." };
      }
      if (args.details !== undefined && typeof args.details !== "string") {
        return { status: "error", error: "save_task 'details' must be a string if provided." };
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          workspace_id: workspaceId,
          title: args.title.trim().slice(0, 300),
          details: typeof args.details === "string" ? args.details.slice(0, 2000) : null
        })
        .select()
        .single();

      if (error) return { status: "error", error: error.message };
      return { status: "success", result: data };
    }

    if (toolName === "send_summary") {
      const args = rawArgs as Record<string, unknown>;
      if (typeof args?.summary !== "string" || !args.summary.trim()) {
        return { status: "error", error: "send_summary requires a non-empty string 'summary'." };
      }

      const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;
      if (!webhookUrl) {
        return {
          status: "error",
          error: "No NOTIFY_WEBHOOK_URL configured on the server -- cannot send."
        };
      }

      const body = JSON.stringify({
        text: args.summary.slice(0, 3000),
        content: args.summary.slice(0, 3000)
      });

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });

      if (!res.ok) {
        return { status: "error", error: `Webhook responded with ${res.status}` };
      }
      return { status: "success", result: { sent: true } };
    }

    return { status: "error", error: "Unhandled tool." };
  } catch (err: any) {
    return { status: "error", error: err?.message ?? "Tool execution threw an error." };
  }
}
