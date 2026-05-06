# RAG Document Q&A

A full-stack Retrieval-Augmented Generation (RAG) app that lets you upload documents and ask questions grounded in their content — with source citations for every answer.

**Live demo:** [rag-doc-3hofto540-connorkoch0511s-projects.vercel.app](https://rag-doc-qa-five.vercel.app)

![App screenshot](e2e/screenshots/13-answer-received.png)

---

## What is RAG?

RAG is a technique that combines a vector search step with an LLM call. Instead of asking the model to answer from memory (which leads to hallucinations), you:

1. **Chunk** the document into overlapping segments
2. **Embed** each chunk into a high-dimensional vector
3. **Store** those vectors in a database that supports similarity search
4. At query time, **embed the question** and find the most semantically similar chunks
5. **Inject those chunks** into the prompt as context, constraining the model to answer only from them
6. **Stream the answer** back with citations pointing to the exact source chunks

This pipeline is the foundation of most enterprise AI knowledge base products.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, streaming support, Vercel-native |
| Language | TypeScript | Type safety across the pipeline |
| Styling | Tailwind CSS | Utility-first, no runtime overhead |
| Auth | Supabase Auth | Integrated with the DB, no extra service needed |
| Vector DB | Supabase pgvector | Free tier, SQL-native, `<=>` cosine distance operator |
| Embeddings | HuggingFace Inference API (`all-MiniLM-L6-v2`) | Free, 384-dim vectors, strong semantic similarity |
| LLM | Groq (`llama-3.1-8b-instant`) | Free tier, extremely fast inference |
| Streaming | Vercel AI SDK (`streamText` + `useChat`) | First-class SSE streaming in Next.js |
| PDF parsing | `unpdf` | WASM-based, works in serverless without `fs` hacks |

**No LangChain or LlamaIndex.** The chunker, embedder, and retriever are implemented from scratch — which is the point of this project.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE                    │
│                                                              │
│  Upload   →   Parse   →   Chunk   →   Embed   →   Store     │
│  (file)     (unpdf)    (chunker)   (HF API)   (pgvector)    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                         QUERY PIPELINE                       │
│                                                              │
│  Question → Embed → Retrieve → Augment prompt → Stream LLM  │
│            (HF API) (pgvector)  (+ citations)   (Groq)      │
└──────────────────────────────────────────────────────────────┘
```

### Key files

```
lib/
├── rag/
│   ├── chunker.ts      # Recursive sentence-aware text splitter
│   ├── embedder.ts     # HuggingFace batched embedding with cold-start retry
│   ├── retriever.ts    # pgvector cosine similarity search via Supabase RPC
│   └── pipeline.ts     # Ingest orchestrator (parse → chunk → embed → store)
├── parsers/pdf.ts      # unpdf wrapper with page-number tracking
└── groq.ts             # Prompt construction with [Source N] citation format

app/api/
├── upload/route.ts     # POST: ingestion entry point (60s timeout)
├── chat/route.ts       # POST: RAG query + Groq streaming
└── documents/
    ├── route.ts        # GET: list user's documents
    └── [id]/route.ts   # DELETE: remove document + cascade chunks
```

### Chunking strategy

Rather than splitting on a fixed character count, the chunker uses a **recursive separator hierarchy**:

```
paragraph breaks → line breaks → sentence endings → words → characters
```

Chunks are 512 characters with 100-character overlap to preserve context across boundaries. Each chunk tracks its source page number for accurate citations.

### Similarity search

The database exposes a `match_chunks` SQL function that runs cosine distance search via pgvector:

```sql
1 - (c.embedding <=> query_embedding) as similarity
```

An IVFFlat index (`lists=100`) makes this sub-millisecond at scale.

### Citations

Retrieved chunks are serialized to JSON, base64-encoded (to handle non-ASCII characters), and sent back in the `X-Citations` response header alongside the streamed answer. The client reads them in the AI SDK's `onResponse` callback and associates them with the completed message.

---

## Database Schema

```sql
documents (id, name, size_bytes, mime_type, user_id, created_at)
chunks    (id, document_id, content, chunk_index, page_number, token_count, embedding vector(384))
```

Row Level Security is enabled on both tables — users can only access their own documents.

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the `vector` extension enabled
- A [Groq](https://console.groq.com) API key (free)
- A [HuggingFace](https://huggingface.co/settings/tokens) API token (free)

### 1. Clone and install

```bash
git clone https://github.com/connorkoch0511/RAG-Doc-QA.git
cd RAG-Doc-QA
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Database → Extensions** and enable the `vector` extension
3. Open the **SQL Editor** and run both migration files in order:
   - `supabase/migrations/001_rag_schema.sql`
   - `supabase/migrations/002_add_auth.sql`

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GROQ_API_KEY=gsk_...
HUGGINGFACE_API_TOKEN=hf_...
```

> **Note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It is only used server-side and must never be prefixed with `NEXT_PUBLIC_`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Running Tests

The test suite uses [Playwright](https://playwright.dev) and covers auth flows, document upload with pipeline progress, Q&A with citations, document selection, and delete.

```bash
# Run all tests (requires dev server running or will start one)
npm test

# Run with Playwright's interactive UI
npm run test:ui
```

Screenshots from each test step are saved to `e2e/screenshots/`.

---

## Deployment

The app is configured for [Vercel](https://vercel.com). Push to `main` and it deploys automatically.

Set the same five environment variables in **Vercel → Settings → Environment Variables**.

---

## Known Limitations

- **File size:** Vercel's Hobby plan limits request bodies to ~4.5MB, so documents must be under 4MB.
- **HuggingFace cold starts:** The free inference API may take 10–20 seconds to warm up after a period of inactivity. The embedder retries automatically.
- **No PDF scanned images:** `unpdf` extracts text only. PDFs that are scanned images with no text layer will produce empty content.
