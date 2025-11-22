import express from "express"
import fs from "fs"
import crypto from "crypto"
import dotenv from "dotenv"
import { GoogleGenerativeAI } from "@google/generative-ai"
dotenv.config()

const app = express()
app.use(express.json())

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const CACHE_FILE = "./src/cache/emoji-cache.json"
let cache = {}

if (fs.existsSync(CACHE_FILE)) {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"))
}

// ---------------------------
// Normalize + Hash
// ---------------------------
function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ")
}

function hashVector(vector) {
  const str = vector.slice(0, 16).join(",")  
  return crypto.createHash("md5").update(str).digest("hex").slice(0, 8)
}

// ---------------------------
// Vector encoding
// ---------------------------
function compressVector(vector) {
  return vector.map(v => Number(v.toFixed(2)))
}

function encodeVectorToBase64(vector) {
  const floatArray = new Float32Array(vector)
  const buffer = Buffer.from(floatArray.buffer)
  return buffer.toString("base64")
}

function decodeBase64ToVector(base64) {
  const buffer = Buffer.from(base64, "base64")
  const floatArray = new Float32Array(buffer.buffer)
  return Array.from(floatArray)
}

// ---------------------------
// Cosine Similarity
// ---------------------------
function cosineSim(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v*v, 0))
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v*v, 0))
  return dot / (magA * magB)
}

// similarity threshold
const SIM_THRESHOLD = 0.75

// ---------------------------
// Main route
// ---------------------------
app.post("/api/emoji", async (req, res) => {
  const text = req.body.text
  if (!text) return res.json({ error: "text required" })

  const normalized = normalize(text)

  // 1) Embedding
  const embedModel = ai.getGenerativeModel({ model: "text-embedding-004" })
  const embeddingResponse = await embedModel.embedContent(normalized)
  let newVector = embeddingResponse.embedding.values
  newVector = compressVector(newVector)

  // 2) Check semantic clusters
  for (const clusterKey in cache) {
    const vector = decodeBase64ToVector(cache[clusterKey].vector)
    const sim = cosineSim(newVector, vector)

    if (sim >= SIM_THRESHOLD) {
      // same semantic cluster → reuse emoji
      return res.json({
        result: cache[clusterKey].emoji,
        cluster: clusterKey,
        similarity: sim.toFixed(3),
        source: "semantic-cluster-hit"
      })
    }
  }

  // 3) No cluster matched → Generate new emoji
  const genModel = ai.getGenerativeModel({ model: "gemini-2.0-flash" })
  const result = await genModel.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: `Return only emojis. No words: ${text}` }]
    }]
  })

  let emoji = result.response.text()
  emoji = emoji.replace(/[^\p{Emoji}\p{Extended_Pictographic}]/gu, "").trim()

  // 4) Create new cluster
  const clusterKey = hashVector(newVector)

  cache[clusterKey] = {
    emoji,
    vector: encodeVectorToBase64(newVector),
    representative: normalized,   // 대표 문장
    createdAt: Date.now()
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))

  res.json({
    result: emoji,
    cluster: clusterKey,
    source: "new-semantic-cluster"
  })
})

app.listen(process.env.port)
