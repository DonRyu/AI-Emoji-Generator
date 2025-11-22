import express from "express"
import fs from "fs"
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

function compressVector(vector) {
  return vector.map(v => Number(v.toFixed(2)))
}

function cosineSim(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v*v, 0))
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v*v, 0))
  return dot / (magA * magB)
}

const SIM_THRESHOLD = 0.85 // semantic cache

app.post("/api/emoji", async (req, res) => {
  const text = req.body.text
  if (!text) return res.json({ error: "text required" })

  const embedModel = ai.getGenerativeModel({ model: "text-embedding-004" })
  
  const embeddingResponse = await embedModel.embedContent(text)
  let newVector = embeddingResponse.embedding.values
  newVector = compressVector(newVector)

  for (const key in cache) {
    const sim = cosineSim(newVector, cache[key].vector)
    if (sim >= SIM_THRESHOLD) {
      return res.json({ 
        result: cache[key].emoji, 
        match: key, 
        similarity: sim.toFixed(3), 
        source: "semantic-cache" 
      })
    }
  }

  const genModel = ai.getGenerativeModel({ model: "gemini-2.0-flash" })
  const result = await genModel.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: `Return only emojis. No words: ${text}` }]
    }]
  })

  let output = result.response.text()
  output = output.replace(/[^\p{Emoji}\p{Extended_Pictographic}]/gu, "").trim()

  cache[text] = {
    emoji: output,
    vector: newVector
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))

  res.json({ result: output, source: "gemini-api" })
})

app.listen(process.env.port)
