

Problem overview

Text normalization (remove special char, trim, match the case)

Generate semantic embedding (convert text into a meaning-based vector) text-embedding-004 model.

Vector is very large → compress Float32 values

JSON file becomes huge → encode vector as Base64

On each request → decode Base64 back to Float32

Compare vectors using cosine similarity

High similarity → reuse cached emoji

Low similarity → generate a new emoji and store new vector

Result: faster responses and fewer API calls

Demo


“Client-side: simple in-memory caching with React ref to avoid repeated API calls.”
debounce