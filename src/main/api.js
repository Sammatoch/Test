import Anthropic from '@anthropic-ai/sdk'
import OpenAI, { toFile } from 'openai'
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
          text2: { type: 'string' },
          label: { type: 'string' },
          imagePrompt: { type: 'string' },
          showsBook: { type: 'boolean' }
        },
        required: ['text', 'text2', 'label', 'imagePrompt', 'showsBook']
      }
    },
    visualStyle: { type: 'string' },
    hookSummary: { type: 'string' }
  },
  required: ['slides', 'visualStyle', 'hookSummary']
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
          text2: { type: SchemaType.STRING },
          label: { type: SchemaType.STRING },
          imagePrompt: { type: SchemaType.STRING },
          showsBook: { type: SchemaType.BOOLEAN }
        },
        required: ['text', 'text2', 'label', 'imagePrompt', 'showsBook']
      }
    },
    visualStyle: { type: SchemaType.STRING },
    hookSummary: { type: SchemaType.STRING }
  },
  required: ['slides', 'visualStyle', 'hookSummary']
}

function buildPrompt(params) {
  const { bookTitle, niche, situation, hook, perspective, language } = params
  const languageLabel = language === 'de' ? 'Deutsch' : language === 'en' ? 'English' : language === 'es' ? 'Español' : language
  const perspectiveLabel =
    perspective === 'alternating'
      ? 'Wechselnde Perspektiven (Dialog zwischen zwei Personen)'
      : 'Eine Perspektive (innerer Monolog)'

  const isDialog = perspective === 'alternating'

  const textRules = isDialog
    ? `Regeln für den Text (DIALOG-Modus — PFLICHT):
- 6-8 Slides, jede hat ZWEI Sprechertexte
- "text": Aussage von Person A (erscheint OBEN) — MAXIMAL 5 WÖRTER, eine einzige Zeile, kein Zeilenumbruch
- "text2": Reaktion von Person B (erscheint UNTEN) — MAXIMAL 5 WÖRTER, eine einzige Zeile, kein Zeilenumbruch
- Kein "A:" / "B:"-Prefix, nur den reinen kurzen Satz
- Beide Texte zusammen bauen Spannung auf — extrem knapp, direkt, emotional triggern
- Letzter Slide: text = Kauf-Aufruf (max. 5 Wörter), text2 = Handlungsaufforderung (max. 5 Wörter)`
    : `Regeln für den Text (MONOLOG-Modus):
- 6-10 kurze Slides, jede max. 2-3 Zeilen in "text"
- "text2" IMMER leer lassen: ""
- Sehr kurze, prägnante Sätze die emotional triggern
- Letzter Slide: klarer KAUF-Aufruf (Call-to-Action), der konkret zum Kauf des Buchs "${bookTitle}" anregt`

  const jsonExample = isDialog
    ? `{ "text": "Person A Text...", "text2": "Person B Antwort...", "label": "", "imagePrompt": "...", "showsBook": false }`
    : `{ "text": "Slide-Text...", "text2": "", "label": "", "imagePrompt": "...", "showsBook": false }`

  return `Du bist ein viraler TikTok Content Creator für Sachbücher.
Erstelle einen emotionalen TikTok-Slideshow-Post für das Buch "${bookTitle}" in der Nische "${niche}".

Situation: "${situation}"
Hook: "${hook}"
Perspektive: ${perspectiveLabel}
Ausgabe-Sprache: ${languageLabel}
WICHTIG: Buchtitel immer in der Originalsprache: "${bookTitle}"

${textRules}

Regeln für den durchgängigen Bild-Stil (visualStyle):
- Definiere EINEN einzigen, durchgängigen visuellen Stil für die GESAMTE Slideshow
- Dieser Stil beschreibt: Bildstil/Medium (z.B. cinematic photo, warm film look), Farbpalette, Licht/Stimmung, wiederkehrende Hauptfigur (gleiches Aussehen, Kleidung), gleicher Schauplatz/Setting
- Sehr konkret und detailliert, damit alle Bilder wie aus EINER Serie wirken
- Auf Englisch

Regeln für die Bild-Prompts:
- JEDE Slide bekommt einen EIGENEN, individuellen Bild-Prompt (imagePrompt)
- WICHTIG: Jeder imagePrompt MUSS exakt zum definierten visualStyle passen (gleiche Figur, gleiches Setting, gleiche Farben, gleiches Licht) — es soll wie dieselbe Bildserie aussehen
- Es ändert sich nur die konkrete Szene/Handlung passend zum Text dieser Slide
- Bild-Prompt auf Englisch, detailliert, cinematic, 9:16 Hochformat${isDialog ? '\n- DIALOG-MODUS: Jedes Bild MUSS ZWEI Personen zeigen — Person A im oberen Bildbereich, Person B im unteren Bildbereich sichtbar' : ''}

Regel für "showsBook" (Buch im Bild):
- Setze "showsBook" = true für JEDE Slide, in deren Szene ein Buch zu sehen ist (z.B. jemand hält ein Buch, liest darin, das Buch liegt auf dem Tisch)
- Bei diesen Slides: nenne das Buch im imagePrompt generisch als "the book" — beschreibe NICHT eine erfundene Buchgestaltung (Titel/Cover). Das echte Cover wird separat als Referenzbild eingefügt.
- Setze "showsBook" = false, wenn KEIN Buch in der Szene vorkommt
- Die letzte Slide (Kauf-Aufruf) zeigt typischerweise das Buch → showsBook = true

Antworte NUR mit folgendem JSON (kein Markdown, kein Extra-Text):
{
  "slides": [${jsonExample}],
  "visualStyle": "ONE consistent visual style for ALL slides: medium, color palette, lighting, recurring character & setting",
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
      ? { text: s, text2: '', label: '', imagePrompt: '', showsBook: false }
      : { text: s?.text ?? '', text2: s?.text2 ?? '', label: s?.label ?? '', imagePrompt: s?.imagePrompt ?? '', showsBook: !!s?.showsBook }))
    .filter(s => s.text && String(s.text).trim())
  return {
    slides,
    visualStyle: result?.visualStyle || '',
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

// Hard quota/billing errors are NOT transient — retrying won't help, fail fast
function isHardQuota(e) {
  const msg = String(e?.error?.message || e?.message || e || '')
  return /insufficient_quota|billing|hard limit|exceeded your current quota|quota exceeded/i.test(msg)
}

function errorDetail(e) {
  const status = e?.status ?? e?.code ?? e?.error?.code
  const msg = e?.error?.message || e?.message || (typeof e === 'string' ? e : '')
  return [status ? `Status ${status}` : '', msg].filter(Boolean).join(': ').slice(0, 500)
}

async function withRetry(fn, { retries = 3, baseDelay = 5000 } = {}) {
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (e) {
      if (!isRateLimit(e) || isHardQuota(e) || attempt >= retries) throw e
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, delay))
      attempt++
    }
  }
}

async function generateImageOpenAI(prompt, settings, referenceImages) {
  if (!settings.openaiKey) throw new Error('Bitte OpenAI API-Key in Einstellungen hinterlegen')
  const client = new OpenAI({ apiKey: settings.openaiKey })

  // With reference images, use the edit endpoint so the new image matches the references
  if (referenceImages && referenceImages.length) {
    const files = await Promise.all(
      referenceImages.slice(0, 4).map((b64, i) =>
        toFile(Buffer.from(b64, 'base64'), `ref${i}.png`, { type: 'image/png' })
      )
    )
    const res = await withRetry(() => client.images.edit({
      model: 'gpt-image-1',
      image: files,
      prompt,
      n: 1,
      size: '1024x1536'
    }))
    const img = res.data[0]
    if (img.b64_json) return img.b64_json
    const resp = await fetch(img.url)
    return Buffer.from(await resp.arrayBuffer()).toString('base64')
  }

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

// Google enforces a per-model daily quota (e.g. 70/day on paid tier 1). Each model
// has its OWN bucket, so on a daily-quota error we fall back to the next model.
const IMAGEN_MODELS = [
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001',
  'imagen-3.0-generate-002'
]

function isDailyQuota(e) {
  const msg = String(e?.error?.message || e?.message || e || '')
  return /per_day|exceeded your current quota|quota exceeded/i.test(msg)
}

async function generateImageGemini(prompt, settings) {
  if (!settings.geminiKey) throw new Error('Bitte Gemini API-Key in Einstellungen hinterlegen')
  const ai = new GoogleGenAI({ apiKey: settings.geminiKey })
  let lastErr
  for (let i = 0; i < IMAGEN_MODELS.length; i++) {
    const model = IMAGEN_MODELS[i]
    try {
      const res = await withRetry(() => ai.models.generateImages({
        model,
        prompt,
        config: { numberOfImages: 1, aspectRatio: '9:16' }
      }))
      const generated = res?.generatedImages?.[0]
      const bytes = generated?.image?.imageBytes || generated?.image?.bytesBase64Encoded
      if (!bytes) throw new Error('Gemini hat kein Bild zurückgegeben (evtl. durch Sicherheitsfilter blockiert)')
      return bytes
    } catch (e) {
      lastErr = e
      // Only try the next model if THIS model's daily quota is exhausted
      if (isDailyQuota(e) && i < IMAGEN_MODELS.length - 1) continue
      throw e
    }
  }
  throw lastErr
}

// Gemini 2.5 Flash Image ("Nano Banana") supports image INPUT + editing, unlike Imagen.
// We use it when we have reference images (e.g. embed the book cover naturally into a scene).
async function generateImageGeminiEdit(prompt, settings, referenceImages) {
  if (!settings.geminiKey) throw new Error('Bitte Gemini API-Key in Einstellungen hinterlegen')
  const ai = new GoogleGenAI({ apiKey: settings.geminiKey })
  const contents = [
    { text: prompt },
    ...referenceImages.slice(0, 4).map(b64 => ({
      inlineData: { mimeType: 'image/png', data: b64 }
    }))
  ]
  const res = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents
  }))
  const parts = res?.candidates?.[0]?.content?.parts || []
  for (const part of parts) {
    if (part.inlineData?.data) return part.inlineData.data
  }
  throw new Error('Gemini hat kein Bild zurückgegeben (evtl. durch Sicherheitsfilter blockiert)')
}

export async function generateImage(prompt, settings, imageProvider = 'openai', referenceImages = null) {
  try {
    if (imageProvider === 'gemini') {
      // With a reference image, use the editing-capable model so the book is woven into the scene
      if (referenceImages && referenceImages.length) {
        return await generateImageGeminiEdit(prompt, settings, referenceImages)
      }
      return await generateImageGemini(prompt, settings)
    }
    return await generateImageOpenAI(prompt, settings, referenceImages)
  } catch (e) {
    if (isRateLimit(e)) {
      const hint = imageProvider === 'gemini'
        ? 'Das ist KEIN Geld-Problem: Google begrenzt Imagen auf ein TAGES-Kontingent pro Modell (z.B. 70 Bilder/Tag im Paid Tier 1). Es wird automatisch auf weitere Imagen-Modelle ausgewichen — auch deren Tageslimit ist nun erreicht. Lösung: bis zum Reset (Mitternacht US-Pazifik) warten, in der Google Cloud Console eine Quota-Erhöhung beantragen, ODER zum Bild-Provider „OpenAI" wechseln.'
        : 'Wichtig: Ein OpenAI-429 bedeutet oft „insufficient_quota" (Projekt-/Usage-Limit), nicht zwingend zu viele Anfragen. Prüfe Billing und die Usage-Limits deines Projekts im OpenAI-Dashboard.'
      throw new Error(`Kontingent/Limit erreicht (429). ${hint}\n\nOriginalmeldung des Anbieters: ${errorDetail(e)}`)
    }
    throw e
  }
}

export async function scrapeViralTikToks(searchQuery, apifyKey, maxResults = 20) {
  if (!apifyKey) throw new Error('Bitte Apify API-Key in Einstellungen hinterlegen')
  const actorId = 'clockworks~free-tiktok-scraper'
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyKey}&timeout=120`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchSection: '/video',
      searchQueries: [searchQuery],
      resultsPerPage: maxResults
    })
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Apify Fehler ${response.status}: ${text.slice(0, 300)}`)
  }
  return response.json()
}

export async function analyzeViralContent(videos, settings) {
  if (!settings.anthropicKey) throw new Error('Bitte Anthropic API-Key für die Analyse hinterlegen')
  const topVideos = [...videos]
    .filter(v => v.text || v.description)
    .sort((a, b) => (b.playCount || b.stats?.playCount || 0) - (a.playCount || a.stats?.playCount || 0))
    .slice(0, 10)

  const fmt = n => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'K' : String(n)
  const videoSummaries = topVideos.map((v, i) => {
    const text = (v.text || v.description || '').slice(0, 300)
    const views = v.playCount || v.stats?.playCount || 0
    const likes = v.diggCount || v.stats?.diggCount || 0
    const hashtags = (v.hashtags || []).slice(0, 5).map(h => `#${h.name || h}`).join(' ')
    return `Video ${i + 1} (${fmt(views)} Aufrufe, ${fmt(likes)} Likes):\n"${text}"\n${hashtags}`
  }).join('\n\n')

  const prompt = `Analysiere diese viralen TikTok-Videos und leite daraus eine Hook-Strategie für einen Buch-Slideshow-Post ab.

VIRALE VIDEOS:
${videoSummaries}

Erstelle:
1. Einen emotionalen Hook-Text (max. 2 Sätze, spezifisch und triggert Neugier/Schmerz/Wunsch)
2. Eine kurze Situationsbeschreibung die den Hook motiviert (1-2 Sätze)
3. Kurze Analyse warum diese Videos viral gehen (1-2 Sätze)

Antworte NUR mit diesem JSON:
{"hook":"...","situation":"...","analysis":"..."}`

  if (!videoSummaries.trim()) {
    throw new Error('Keine analysierbaren Video-Texte gefunden. Bitte zuerst eine Suche durchführen.')
  }

  const client = new Anthropic({ apiKey: settings.anthropicKey })
  const msg = await withRetry(() => client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }]
  }))
  const block = (msg.content || []).find(b => b.type === 'text')
  const text = block?.text || ''
  if (!text.trim()) throw new Error('Claude hat keine Antwort geliefert')
  const parsed = parseAIResponse(text)
  if (!parsed?.hook) {
    throw new Error('Analyse konnte nicht ausgewertet werden: ' + text.slice(0, 200))
  }
  return { hook: parsed.hook || '', situation: parsed.situation || '', analysis: parsed.analysis || '' }
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
