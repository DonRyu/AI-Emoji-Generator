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
// Normalize
// ---------------------------
function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ")
}

// ---------------------------
// Hash vector (stable cluster)
// ---------------------------
function hashVector(vector) {
  const str = vector.slice(0, 64).join(",")  
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


  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )

  const floatArray = new Float32Array(arrayBuffer)
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

const SIM_THRESHOLD = 0.68  // best stability

// ---------------------------
// Main API
// ---------------------------
app.post("/api/emoji", async (req, res) => {
  const text = req.body.text
  if (!text) return res.json({ error: "text required" })

  const normalized = normalize(text)

  // 1) Embedding for semantic clustering
  const embedModel = ai.getGenerativeModel({ model: "text-embedding-004" })
  const embeddingResponse = await embedModel.embedContent(normalized)
  const newVector = compressVector(embeddingResponse.embedding.values)

  // 2) Compare with existing clusters
  for (const clusterKey in cache) {
    const vector = decodeBase64ToVector(cache[clusterKey].vector)
    const sim = cosineSim(newVector, vector)

    if (sim >= SIM_THRESHOLD) {
      return res.json({
        result: cache[clusterKey].emoji,
        cluster: clusterKey,
        similarity: sim.toFixed(3),
        source: "semantic-cluster-hit"
      })
    }
  }

  // 3) No cluster matched → generate new emoji
  const genModel = ai.getGenerativeModel({ model: "gemini-2.0-flash" })
  const result = await genModel.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: `Return only emojis. No words: ${text}` }]
    }]
  })

  let emoji = result.response.text()
  emoji = emoji.match(/[\p{Emoji}\p{Extended_Pictographic}]+/gu)?.join("") || ""

  // 4) New cluster creation
  const clusterKey = hashVector(newVector)

  cache[clusterKey] = {
    emoji,
    vector: encodeVectorToBase64(newVector),
    representative: normalized,
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
