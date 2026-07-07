import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { chunkText, sha256Hex } from "@/lib/chunk";
import { embedBatch } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const workspaceId = formData.get("workspaceId") as string | null;

  if (!file || !workspaceId) {
    return NextResponse.json({ error: "file and workspaceId are required" }, { status: 400 });
  }

 
  const { data: workspace, error: wsErr } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .single();
  if (wsErr || !workspace) {
    return NextResponse.json({ error: "Workspace not found or not yours" }, { status: 404 });
  }

  const bytes = await file.arrayBuffer();
  const hash = await sha256Hex(bytes);


  const { data: existing } = await supabase
    .from("documents")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("content_hash", hash)
    .maybeSingle();

  if (existing && existing.status === "ready") {
    return NextResponse.json({ documentId: existing.id, skipped: true, reason: "duplicate" });
  }

  let documentId = existing?.id as string | undefined;
  if (!documentId) {
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        workspace_id: workspaceId,
        filename: file.name,
        content_hash: hash,
        status: "processing"
      })
      .select()
      .single();
    if (docErr || !doc) {
      return NextResponse.json({ error: docErr?.message ?? "Insert failed" }, { status: 500 });
    }
    documentId = doc.id;
  }

  try {
    const text = new TextDecoder("utf-8").decode(bytes);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      return NextResponse.json({ error: "Document had no extractable text" }, { status: 422 });
    }

    const embeddings = await embedBatch(chunks);

  
    const rows = chunks.map((content, i) => ({
      workspace_id: workspaceId,
      document_id: documentId,
      chunk_index: i,
      content,
      embedding: embeddings[i]
    }));

    const { error: chunkErr } = await supabase
      .from("chunks")
      .upsert(rows, { onConflict: "document_id,chunk_index" });

    if (chunkErr) {
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      return NextResponse.json({ error: chunkErr.message }, { status: 500 });
    }

    await supabase.from("documents").update({ status: "ready" }).eq("id", documentId);

    return NextResponse.json({ documentId, chunkCount: chunks.length });
  } catch (err: any) {
    await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
    return NextResponse.json({ error: err?.message ?? "Ingestion failed" }, { status: 500 });
  }
}
