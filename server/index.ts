import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import OpenAI from 'openai'

const app = express()
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

app.use(cors())
app.use(bodyParser.json())

app.post('/api/emoji', async (req, res) => {
  try {
    const text = String(req.body?.text ?? '')
    const prompt = `Return only 1-3 emojis that best express the following text. No words, no punctuation, emojis only.\nText: ${text}`
    const resp = await client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt
    })
    const content = resp.output_text?.trim() ?? ''
    res.json({ emoji: content })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'error' })
  }
})

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => {})
