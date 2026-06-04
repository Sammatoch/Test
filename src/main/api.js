import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { GoogleGenAI } from '@google/genai'

const POST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string' },
          label: { type: 'string' },
          imagePrompt: { type: 'string' }
        },
        required: ['text', 'label', 'imagePrompt']
      }
    },
    hookSummary: { type: 'string' }
  },
  required: ['slides', 'hookSummary']
}

const GEMINI_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    slides: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          text: { type: SchemaType.STRING },
          label: { type: SchemaType.STRING },
          imagePrompt: { type: SchemaType.STRING }
        },
        required: ['text', 'label', 'imagePrompt']
      }
    },
    hookSummary: { type: SchemaType.STRING }
  },
  required: ['slides', 'hookSummary']
}

function buildPrompt(params) {
  const { bookTitle, niche, situation, hook, perspective, language } = params
  const languageLabel = language === 'de' ? 'Deutsch' : language === 'en' ? 'English' : language === 'es' ? 'Español' : language
  const perspectiveLabel =
    perspective === 'alternating'
      ? 'Wechselnde Perspektiven (Dialog zwischen zwei Personen)'
      : 'Eine Perspektive (innerer Monolog)'

  return `Du bist ein viraler TikTok Content Creator für Sachbücher.
Erstelle einen emotionalen TikTok-Slideshow-Post für das Buch "${bookTitle}" in der Nische "${niche}".

Situation: "${situation}"
Hook: "${hook}"
Perspektive: ${perspectiveLabel}
Ausgabe-Sprache: ${languageLabel}
WICHTIG: Buchtitel immer in der Originalsprache: "${bookTitle}"

Regeln für den Text:
- 6-10 kurze Slides, jede max. 2-3 Zeilen
- Sehr kurze, prägnante Sätze die emotional triggern
- Dialoge erzeugen starke Spannung
- Letzter Slide: Call-to-Action mit Buchtitel
- Text muss zum Weiterklicken zwingen

Regeln für die Bild-Prompts:
- JEDE Slide bekommt einen EIGENEN, individuellen Bild-Prompt (imagePrompt)
- Der Bild-Prompt passt visuell und emotional genau zum Text dieser Slide
- Die Bilder einer Slideshow sollen zusammen eine visuelle Geschichte erzählen, aber jedes Bild ist anders
- Bild-Prompt auf Englisch, detailliert, cinematic, auf Viralität ausgelegt (9:16 Hochformat)

Antworte NUR mit folgendem JSON (kein Markdown, kein Extra-Text):
{
  "slides": [{ "text": "...", "label": "", "imagePrompt": "Detailed English image description for THIS slide, cinematic, viral, 9:16" }],
  "hookSummary": "One sentence why this is viral"
}`
}

function parseAIResponse(text) {
  let cleaned = text.trim()
  // Strip markdown fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  // Extract JSON object by finding outermost { } — handles any leading/trailing prose
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1)
  }
  return JSON.parse(cleaned)
}

function extractSlides(slidesRaw) {
  if (Array.isArray(slidesRaw)) return slidesRaw
  if (slidesRaw && typeof slidesRaw === 'object') return Object.values(slidesRaw)
  if (typeof slidesRaw === 'string') {
    try {
      const parsed = JSON.parse(slidesRaw)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') return Object.values(parsed)
    } catch { /* fall through to lenient extraction */ }
    // Recover complete slide objects (with per-slide imagePrompt) even from truncated JSON
    const slides = []
    const reFull = /\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"label"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"imagePrompt"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g
    let m
    while ((m = reFull.exec(slidesRaw)) !== null) {
      try {
        slides.push({
          text: JSON.parse('"' + m[1] + '"'),
          label: JSON.parse('"' + m[2] + '"'),
          imagePrompt: JSON.parse('"' + m[3] + '"')
        })
      } catch { /* skip malformed */ }
    }
    if (slides.length) return slides
    // Fallback: text + label only
    const reBoth = /\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"label"\s*:\s*"((?:[^"\\]|\\.)*)"/g
    while ((m = reBoth.exec(slidesRaw)) !== null) {
      try {
        slides.push({ text: JSON.parse('"' + m[1] + '"'), label: JSON.parse('"' + m[2] + '"') })
      } catch { /* skip malformed */ }
    }
    if (slides.length) return slides
    // Last resort: grab any "text": "..." values
    const reText = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g
    while ((m = reText.exec(slidesRaw)) !== null) {
      try { slides.push({ text: JSON.parse('"' + m[1] + '"'), label: '' }) } catch { /* skip */ }
    }
    return slides
  }
  return []
}

function normalizeResult(result) {
  const slides = extractSlides(result?.slides)
    .map(s => (typeof s === 'string'
      ? { text: s, label: '', imagePrompt: '' }
      : { text: s?.text ?? '', label: s?.label ?? '', imagePrompt: s?.imagePrompt ?? '' }))
    .filter(s => s.text && String(s.text).trim())
  return {
    slides,
    hookSummary: result?.hookSummary || ''
  }
}

export async function generateContent(params, settings) {
  const { provider } = params
  const prompt = buildPrompt(params)

  if (provider === 'anthropic') {
    if (!settings.anthropicKey) throw new Error('Bitte Anthropic API-Key in Einstellungen hinterlegen')
    const client = new Anthropic({ apiKey: settings.anthropicKey })
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [{ name: 'create_tiktok_post', description: 'Erstellt einen TikTok-Slideshow-Post', input_schema: POST_SCHEMA }],
      tool_choice: { type: 'tool', name: 'create_tiktok_post' },
      messages: [{ role: 'user', content: prompt }]
    })
    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse) throw new Error('Keine gültige Antwort von Claude erhalten')
    return normalizeResult(toolUse.input)
  }

  if (provider === 'openai') {
    if (!settings.openaiKey) throw new Error('Bitte OpenAI API-Key in Einstellungen hinterlegen')
    const client = new OpenAI({ apiKey: settings.openaiKey })
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'tiktok_post', strict: true, schema: POST_SCHEMA }
      }
    })
    return normalizeResult(parseAIResponse(res.choices[0].message.content))
  }

  if (provider === 'gemini') {
    if (!settings.geminiKey) throw new Error('Bitte Gemini API-Key in Einstellungen hinterlegen')
    const genAI = new GoogleGenerativeAI(settings.geminiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json', responseSchema: GEMINI_SCHEMA }
    })
    const result = await model.generateContent(prompt)
    return normalizeResult(parseAIResponse(result.response.text()))
  }

  throw new Error(`Unbekannter Provider: ${provider}`)
}

function isRateLimit(e) {
  const status = e?.status ?? e?.code ?? e?.error?.code
  const msg = String(e?.message || e?.error?.message || e || '')
  return status === 429 || /\b429\b|RESOURCE_EXHAUSTED|rate.?limit|too many requests/i.test(msg)
}

async function withRetry(fn, { retries = 3, baseDelay = 5000 } = {}) {
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (e) {
      if (!isRateLimit(e) || attempt >= retries) throw e
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, delay))
      attempt++
    }
  }
}

async function generateImageOpenAI(prompt, settings) {
  if (!settings.openaiKey) throw new Error('Bitte OpenAI API-Key in Einstellungen hinterlegen')
  const client = new OpenAI({ apiKey: settings.openaiKey })
  const res = await withRetry(() => client.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1536'
  }))
  const img = res.data[0]
  if (img.b64_json) return img.b64_json
  const resp = await fetch(img.url)
  const arrayBuffer = await resp.arrayBuffer()
  return Buffer.from(arrayBuffer).toString('base64')
}

async function generateImageGemini(prompt, settings) {
  if (!settings.geminiKey) throw new Error('Bitte Gemini API-Key in Einstellungen hinterlegen')
  const ai = new GoogleGenAI({ apiKey: settings.geminiKey })
  const res = await withRetry(() => ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: { numberOfImages: 1, aspectRatio: '9:16' }
  }))
  const generated = res?.generatedImages?.[0]
  const bytes = generated?.image?.imageBytes
  if (!bytes) throw new Error('Gemini hat kein Bild zurückgegeben (evtl. durch Sicherheitsfilter blockiert)')
  return bytes
}

export async function generateImage(prompt, settings, imageProvider = 'openai') {
  try {
    if (imageProvider === 'gemini') return await generateImageGemini(prompt, settings)
    return await generateImageOpenAI(prompt, settings)
  } catch (e) {
    if (isRateLimit(e)) {
      throw new Error('Limit erreicht: Der Anbieter hat das Kontingent/Rate-Limit überschritten (429). Bitte kurz warten und erneut versuchen, oder dein Kontingent/Billing beim Anbieter prüfen.')
    }
    throw e
  }
}

export function applyTikTokIndexing(text) {
  const invisible = ['​', '‌', '‍']
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += text[i]
    if (text[i] !== ' ' && text[i] !== '\n' && Math.random() < 0.12) {
      result += invisible[Math.floor(Math.random() * invisible.length)]
    }
  }
  return result
}
