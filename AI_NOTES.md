# AI_NOTES.md

> This file is a **template**. Fill in the bracketed sections with what actually
> happened once you've run this locally, deployed it, and used Claude/whatever AI
> tool yourself to extend or debug it. The assessment specifically reads this
> section closely for honesty -- don't invent a bug you didn't hit. If Claude
> scaffolded most of this for you, say so plainly; that's a legitimate and
> expected way to use AI here, as long as you can explain every decision below.

## AI context/instruction files

[If you didn't use CLAUDE.md / AGENTS.md / .cursorrules etc., say so plainly, e.g.:
"I worked with Claude directly in chat rather than an agentic coding tool, so
there's no CLAUDE.md/AGENTS.md in this repo -- no persistent instruction file was
used." If you did use one (e.g. running this through Claude Code afterward), commit
it as-is and reference it here.]

## AI tools used

- [Tool name and model, e.g. "Claude (Sonnet), via claude.ai chat"] for scaffolding
  the initial project structure, schema, and API routes.
- [Any other tools -- Cursor, Copilot, etc.]
- Rough split: [e.g. "AI generated the initial scaffold end-to-end; I then ran it
  locally, fixed environment/config issues myself, and wrote the isolation and
  prompt-injection test cases by hand to verify the claims in the code."]

## Key decisions I made myself

Pick 2-3 and write a real paragraph for each. Some candidates from this codebase,
if you keep them as-is -- but only write about ones you actually understood and
would defend in an interview:

1. **Chunking strategy** -- paragraph-aware greedy packing (`src/lib/chunk.ts`)
   with ~1200 char windows and 150 char overlap, rather than a fixed-size
   character split. Why: [your reasoning -- e.g. keeps related sentences together,
   overlap avoids losing context at a boundary].
2. **How retrieval is scoped to a workspace** -- the `workspace_id` filter lives
   inside the `match_chunks` Postgres function's `WHERE` clause, not as a filter
   applied to results in JavaScript after the fact, and RLS policies are a second,
   independent enforcement layer. Why this matters: [explain in your own words why
   a post-hoc filter would be a weaker guarantee].
3. **Tool-calling loop structure** -- the model proposes a tool call, the app
   validates the tool name against an allowlist and the arguments field-by-field
   before executing anything, and the workspace ID used for the side effect always
   comes from the authenticated session, never from the model's output. Why:
   [explain the prompt-injection angle in your own words].
4. **[A service choice you made]** -- e.g. why Supabase over a separate
   Postgres+pgvector host, or why Gemini over Groq.

## The hardest bug or wrong turn

**Be specific and honest here -- this is the part they read most closely.**

Describe:
- What the AI suggested or generated that was wrong.
- How you noticed (what broke, what looked suspicious, what test caught it).
- How you actually fixed it.

[Write this after you've actually run the app and hit something. Good candidates
to watch for while testing, if you haven't hit your own yet:
- pgvector's `<=>` operator and index type mismatches (ivfflat needs data before
  the index is useful; cosine vs L2 distance confusion).
- Supabase RLS silently returning empty results instead of an error when a policy
  blocks a query, which looks like "my data disappeared" rather than "permission
  denied."
- Gemini's function-calling response shape changing between SDK versions.
- Forgetting `await` inside the tool-calling loop and having tool results race the
  chat continuation.]

## What I'd improve with more time

- Hybrid search (keyword + vector) or a re-ranking step over the top-k chunks.
- Batch embeddings instead of sequential per-chunk calls during ingestion.
- Streaming the assistant's response token-by-token instead of waiting for the
  full generation.
- Observability: per-request token counts, latency, and a retrieval hit/miss rate
  in the dashboard.
- [Anything else you notice while using it.]

## Optional: illuminating prompt/transcript excerpt

[If you want to include one, keep it short -- a few lines showing the trickiest
exchange, not a full log dump.]
