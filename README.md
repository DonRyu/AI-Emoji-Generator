Example Inputs (Similar Meaning)

"dog running"
"running dog"
"a dog is running fast"

All three should reuse the same cached result using semantic similarity, not exact text match.

🚀 Emoji Generator API — Semantic Caching with Gemini

This project returns emoji-only output using Gemini Flash, while minimizing AI usage through semantic caching powered by embeddings.

Purpose

Reduce API calls, lower cost, and improve response time by identifying meaning-level similarity, not matching raw text.

✨ Main Features

Converts natural language text into emoji-only output

Calls Gemini Flash only when cache miss occurs

Uses semantic similarity via cosine similarity + Gemini Embeddings

Caches results persistently in a local JSON file

Supports repeated and similar queries with near-zero cost

🔍 Process Overview

Client sends a text prompt

Server generates an embedding using free Gemini Embedding model

Vector is compared with existing cache using cosine similarity

If similarity ≥ 0.85 → return cached emoji (no AI call)

Otherwise → call Gemini Flash, generate result, and store (vector + emoji)

⚠️ Known Limitation

One embedding produces ~700 float values

JSON cache grows quickly as entries increase

Real production systems typically use Vector Databases, such as:

Qdrant, Pinecone, Weaviate, Milvus

🧩 Client-Side Enhancements

LocalStorage caching — zero backend call for repeated input

Text normalization — lowercase + trim + whitespace cleanup

English-only input filtering — removes non-English characters

Debounce (400ms) — prevents excessive requests while typing

useRef-based cache state — avoids unnecessary re-renders

Auto LocalStorage sync — result persists after refresh

Loading indicator (⏳) — clear user feedback

Full TypeScript typing — safer and predictable code
