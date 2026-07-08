# AI_NOTES.md

## AI context/instruction files

I worked with Claude directly in chat (claude.ai) rather than an agentic coding
tool like Claude Code or Cursor, so there's no CLAUDE.md, AGENTS.md, or
.cursorrules file in this repo — no persistent instruction file was used.

## AI tools used

- I used Claude (Sonnet) via claude.ai as a coding assistant throughout the project.
- Claude generated the initial project scaffold, including the database schema, API routes, RAG pipeline, and dashboard components.
- I was responsible for configuring the development environment, integrating external services (Supabase, Google Gemini, Vercel, Discord webhooks), resolving dependency and API compatibility issues, testing each required feature, and iterating on the implementation based on real runtime errors.
- During development I repeatedly ran the application, inspected terminal logs, reproduced bugs, and used Claude to discuss possible fixes before implementing and verifying them myself.


## My contribution

Although AI generated much of the initial code, I completed the practical software engineering work required to make the application function correctly. This included:

- Setting up Supabase, Google Gemini, and Vercel.
- Debugging dependency and SDK incompatibilities.
- Updating deprecated Gemini models and SDKs.
- Testing workspace isolation, prompt injection resistance, and tool calling.
- Configuring and verifying the Discord webhook integration.
- Deploying and validating the application end-to-end.
## Key decisions I made myself

1. **Workspace-scoped retrieval enforced inside the query, not after it** — the
   `workspace_id` filter lives inside the `match_chunks` Postgres function's
   `WHERE` clause (`supabase/schema.sql`), and Row Level Security policies are a
   second, independent layer on top of that. This matters because a post-hoc
   filter (e.g. fetching top-k matches across all workspaces in JS, then
   discarding the wrong ones) only works if that filtering code is never
   forgotten or buggy — one missed `if` and another tenant's data leaks. Putting
   the filter in the SQL itself, backed by RLS as a second independent check,
   means the database refuses to return the wrong rows even if the application
   code above it has a bug. I proved this concretely by planting a distinctive
   fact ("silver-heron-9") in one workspace and confirming a second workspace
   couldn't retrieve it, even though both workspaces' chunks sit in the same
   `chunks` table.

2. **Tool-calling loop validates before executing, and the workspace ID never
   comes from the model** — when the model proposes `save_task` or
   `send_summary`, the app checks the tool name against an allowlist and the
   arguments field-by-field before running anything, and the `workspace_id` used
   for the actual database write always comes from the authenticated session,
   never from anything in the model's output or the retrieved document text.
   This is what stops a prompt-injection attack from working even if it
   convinces the model to "want" to call a tool — I tested this directly with a
   planted instruction in a document telling the assistant to call
   `delete_everything`, and the app correctly described that text as inert
   content and never attempted to call an undefined tool.

3. **Idempotent ingestion by content hash** — re-uploading the same file into
   the same workspace is a no-op (checked via `content_hash` in the `documents`
   table before re-chunking/re-embedding), and chunk rows are upserted on
   `(document_id, chunk_index)` rather than blindly inserted. This avoids
   duplicate chunks polluting retrieval if someone uploads the same doc twice,
   which felt important given documents will get re-uploaded accidentally in
   real use.

## The hardest bug or wrong turn

This one took a genuinely long back-and-forth, and it's honestly the most
useful thing I can report: **Claude's initial scaffold used Gemini model names
and an SDK package that had already been deprecated by Google by the time I ran
the code**, and that one wrong assumption cascaded into several confusing,
separate-looking failures.

Specifically:
- The scaffold called `text-embedding-004` for embeddings — Google shut this
  model down on Jan 14, 2026, so every document upload 500'd.
- It also used `gemini-1.5-flash` for chat, and the SDK package
  `@google/generative-ai` — both are now fully retired/superseded (`gemini-1.5`
  is shut down entirely, and the SDK package Claude used is deprecated in favor
  of `@google/genai`).
- On top of that, when I ran `npm install` for the replacement packages,
  `npm` grabbed the *current latest* major versions (`@google/genai` v2.10,
  `pdf-parse` v2.4), which themselves had breaking API changes from what Claude
  had written the fix against (e.g. `pdf-parse` went from a plain
  `pdf(buffer)` function in v1 to a `new PDFParse({data}).getText()` class API
  in v2).

How I noticed: uploads were failing with a generic 500, and I only found the
real cause by testing the Gemini embedding endpoint directly with `curl`
outside the app, which returned a clean `API_KEY_INVALID`/`404 model not found`
error that the app's own error handling was masking.

How it got fixed: several rounds of pasting the actual `curl` responses and
Node stack traces back to Claude so it could look up (via web search) what the
current, non-deprecated model names and package APIs actually were, rather than
guessing from its training data. A secondary, dumber problem compounded this:
partial copy-paste edits into VS Code repeatedly didn't fully overwrite the old
file content, so I kept re-triggering the *same* fixed bug because the old code
was still what was actually running. The fix there was boring but necessary:
verify every file's real on-disk content with `type <file>` in the terminal
after every edit, rather than assuming a paste worked.

The broader lesson: an AI coding assistant's training data has a cutoff, and
fast-moving provider APIs (model names, SDK versions) can silently invalidate
generated code between when it was written and when it's actually run. Treat
any AI-suggested third-party API/model name as something to verify against
current docs, not something to trust outright — and always confirm a file's
actual content on disk, not just assume an edit landed.

## What I'd improve with more time

- Hybrid search (keyword + vector) or a re-ranking step over the top-k chunks.
- Batch embeddings instead of sequential per-chunk calls during ingestion —
  currently each chunk is embedded one at a time, which is slow for large docs.
- Streaming the assistant's response token-by-token instead of waiting for the
  full generation — noticeable latency (2-5s) on every chat message currently.
- Observability: per-request token counts, latency, and a retrieval hit/miss
  rate in the dashboard, so isolation and grounding could be monitored over
  time rather than only spot-checked manually.
- Pin exact dependency versions (not `^` ranges) from the start, given how much
  time the `npm install` grabbing newer major versions cost me here.

## Optional: illuminating prompt/transcript excerpt

> Me: [pasted a 500 error with only a browser stack trace]
> Claude: The browser only ever sees "500" — never why. I need your terminal
> output, where `npm run dev` is running, not the browser console.

This exchange repeated more than once, and it's the single habit that actually
unblocked debugging each time: browser-side errors are useless for diagnosing
server-side crashes in Next.js API routes; the real error only ever showed up
in the terminal or in the raw JSON response body.