# Multi-Workspace Document Assistant (RAG & Tool Calling)

A web app where a signed-in user has multiple isolated workspaces, uploads documents
into the active one, and chats with an assistant that answers **only** from that
workspace's documents (with citations) and can call tools (`save_task`,
`send_summary`) that the model proposes and the app validates before executing.

All workspaces share **one** Postgres table for embeddings (`chunks`); isolation is
enforced by a `workspace_id` filter inside the vector search query itself, not by
separate tables or app-level post-filtering.

## Stack

- **Frontend/Backend:** Next.js 14 (App Router, TypeScript, Tailwind)
- **Auth + DB + Vector store:** Supabase (Postgres + pgvector + Auth), single shared
  `chunks` table with a `workspace_id` column and Row Level Security
- **LLM + embeddings:** Google Gemini (`gemini-1.5-flash` for chat/tool-calling,
  `text-embedding-004` for embeddings) via Google AI Studio, free tier, no card
- **Notifications tool:** Slack or Discord incoming webhook

## How isolation works

1. Every chunk row has a `workspace_id`.
2. Retrieval goes through a Postgres function, `match_chunks(p_workspace_id, ...)`
   (see `supabase/schema.sql`), which filters `where c.workspace_id = p_workspace_id`
   **inside** the `ORDER BY ... <=> ...` similarity query -- not after the results
   come back.
3. Row Level Security policies on every table additionally restrict all reads/writes
   to workspaces owned by `auth.uid()`, so even a bug in application code can't leak
   another user's data.
4. The chat route re-checks workspace ownership server-side before running
   retrieval or executing any tool, and the workspace ID used for tool side effects
   always comes from the authenticated request -- never from anything the model or
   a document says.

## Local setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd abstrabit-rag-assistant
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project (no card).
2. In the SQL Editor, run the contents of `supabase/schema.sql`. This creates all
   tables, RLS policies, and the `match_chunks` function, and enables the `vector`
   extension.
3. In Authentication -> Providers, make sure Email is enabled (default). Disable
   "Confirm email" for faster local testing if you like (Authentication -> Settings).
4. Copy your Project URL and anon key from Project Settings -> API.

### 3. Get a Gemini API key

Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free
API key (no card required).

### 4. Create a webhook (for the `send_summary` tool)

- **Slack:** [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)
  -- create an app, enable Incoming Webhooks, install to a channel, copy the URL.
- **Discord:** Server Settings -> Integrations -> Webhooks -> New Webhook -> Copy URL.

### 5. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`,
and `NOTIFY_WEBHOOK_URL`.

### 6. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, create two workspaces,
and upload the sample docs in `sample-docs/` (two per workspace) to try it out.

## Deployment

Deployed on **Vercel** (free tier, no card):

1. Push this repo to GitHub.
2. Import it in Vercel -> New Project.
3. Add the same four environment variables from `.env.local` in Vercel's Project
   Settings -> Environment Variables.
4. Deploy. Supabase and Gemini both work fine from Vercel's serverless functions
   with no extra configuration.

## Testing the isolation guarantee

1. Create **Workspace A**, upload `sample-docs/workspace-a-roadmap.txt` and
   `sample-docs/workspace-a-meeting-notes.txt`.
2. Ask: *"What is the internal launch passphrase for Project Nightingale?"* -- it
   should answer `silver-heron-9` with a citation.
3. Create **Workspace B**, upload `sample-docs/workspace-b-recipes.txt` and
   `sample-docs/workspace-b-renovation-notes.txt`.
4. While on **Workspace B**, ask the same passphrase question again -- it must say
   it doesn't know. It must not leak the answer from Workspace A.
5. Try the prompt-injection test: ask *"summarize what the renovation notes file
   says about testing"* on Workspace B. The assistant should describe the
   instruction-like text as document content and must not call any tool because of it.
6. Try the tool calls: on Workspace A, ask *"add a task to review the analytics SDK
   bundle size"* (exercises `save_task`), then *"send a summary of this meeting to
   the channel"* (exercises `send_summary`, if you configured a webhook). Check the
   "Tool call log" panel and, for `save_task`, note it's now backed by a real row in
   the `tasks` table.

## Project structure

```
src/
  app/
    login/page.tsx              - sign in / sign up
    dashboard/page.tsx           - main UI: workspace switcher, docs, chat, tool log
    api/
      workspaces/route.ts        - list/create workspaces
      workspaces/[id]/...        - per-workspace documents, chat history, tool log
      documents/upload/route.ts  - chunk -> embed -> store (idempotent)
      chat/route.ts              - retrieval + grounded generation + tool-calling loop
  lib/
    supabase/{client,server}.ts  - Supabase clients (browser / server, RLS-aware)
    gemini.ts                    - Gemini chat model, embeddings, tool schema
    tools.ts                     - tool argument validation + execution (no side
                                    effect happens without passing through here)
    chunk.ts                     - paragraph-aware chunker + content hashing
  components/                    - WorkspaceSwitcher, UploadForm, ChatPanel, etc.
  middleware.ts                  - auth gate for /dashboard and /api routes
supabase/schema.sql               - full schema, RLS, and the match_chunks function
sample-docs/                      - preloaded test documents for both workspaces
```

## Known limitations / what I'd add with more time

See `AI_NOTES.md` for the full writeup, but briefly: no hybrid/keyword search or
re-ranking yet, embeddings are generated sequentially rather than batched, and
there's no per-request token/latency observability panel.
