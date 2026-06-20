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
    hookSummary: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' }
  },
  required: ['slides', 'visualStyle', 'hookSummary', 'title', 'description']
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
    hookSummary: { type: SchemaType.STRING },
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING }
  },
  required: ['slides', 'visualStyle', 'hookSummary', 'title', 'description']
}

// Pool of varied settings/characters so different slideshows don't all default to the same
// "person in a kitchen" framing. One entry is picked per generation as a starting suggestion.
const SETTING_POOL = [
  { setting: 'a cluttered home office at night, laptop glow, stacks of paper', character: 'a man in his 40s wearing a wrinkled hoodie' },
  { setting: 'a quiet park bench at dusk, autumn leaves', character: 'a woman in her 20s wearing an oversized cardigan' },
  { setting: 'a gym locker room or empty gym floor early morning', character: 'a man in his 30s wearing athletic wear, visibly tired' },
  { setting: 'a small balcony with a coffee cup, city rooftops in the background', character: 'a woman in her 50s wearing a linen robe' },
  { setting: 'the inside of a parked car at night, streetlights through the windshield', character: 'a man in his 20s wearing a denim jacket' },
  { setting: 'a cramped student apartment bedroom, fairy lights, laundry pile', character: 'a young woman in her early 20s wearing an oversized t-shirt' },
  { setting: 'a public library reading corner, stacks of books', character: 'a man in his 60s wearing a cardigan and glasses' },
  { setting: 'a bathroom mirror at night, toothbrush in hand', character: 'a woman in her 30s wearing pajamas' },
  { setting: 'a co-working space with other blurred people in the background', character: 'a man in his 30s wearing a casual shirt' },
  { setting: 'a kitchen table cluttered with bills and a laptop, not the stereotypical clean cooking kitchen', character: 'a woman in her 40s wearing a worn cardigan' },
  { setting: 'a hospital or clinic waiting room', character: 'a man in his 50s wearing a plain jacket' },
  { setting: 'a garden or balcony with plants, early sunlight', character: 'a woman in her 60s wearing a gardening apron' },
  { setting: 'a subway or train seat, commuting', character: 'a man in his 20s wearing a backpack and headphones' },
  { setting: 'a messy garage workshop with tools', character: 'a man in his 40s wearing a flannel shirt' },
  { setting: 'a cozy reading nook with a blanket and tea', character: 'a woman in her 30s wearing a knit sweater' }
]
function pickRandomSetting() {
  return SETTING_POOL[Math.floor(Math.random() * SETTING_POOL.length)]
}

// Shared, expert-level rules on what actually makes TikTok slideshows perform.
// TikTok rewards watch-time, swipe-through rate, rewatches, saves and comments —
// every rule below targets one of those mechanics.
function buildViralMechanics(book) {
  return `WIE TIKTOK-SLIDESHOWS VIRAL GEHEN (Experten-Regeln — IMMER befolgen):
- TikTok belohnt WATCH-TIME, DURCHSWIPE-RATE, REWATCHES, SAVES und KOMMENTARE. Optimiere jeden Slide dafür.
- SLIDE 1 = SCROLL-STOPPER. Sie entscheidet in <1 Sekunde alles. Pflicht: EIN mutiger, konkreter Satz, der sofort einen Nerv trifft (Schmerz, Wunsch, Überraschung oder "verbotenes" Wissen). Verboten: Begrüßung, Vorgeplänkel, "In diesem Post…", "Hier sind…". Die erste Zeile muss wie ein Daumen-Stopp wirken.
- OFFENE SCHLEIFE (Open Loop): Jede Slide erzeugt eine kleine offene Frage, die NUR durch Weiterswipen beantwortet wird. Der Leser muss unbedingt wissen wollen, was als Nächstes kommt — baue Mini-Cliffhanger ein.
- KONKRET schlägt GENERISCH: echte Zahlen, Zeiträume, sensorische Details, spezifische Momente ("3 Wochen lang", "um 5 Uhr morgens", "Teig klebte an allen Fingern") statt Floskeln ("es war schwer", "es hat nicht geklappt").
- ZIELGRUPPEN-STIMME: Schreibe aus dem Inneren der Zielgruppe heraus — nicht wie ein Außenstehender der erklärt was sie fühlen, sondern wie jemand der ihren stillen Selbstgespräch-Ton exakt kennt. Welche Wörter benutzt diese Person wenn sie allein ist und das Problem in Gedanken durchgeht? Diese exakte Sprache gehört in jeden Slide — nicht die Außenperspektive, die innere Stimme.
- „DAS BIN GENAU ICH"-FORMEL: Der stärkste emotionale Trigger folgt dieser Formel: KONKRETER MOMENT + INNERSTER GEDANKE + stille Scham oder Sehnsucht. Nicht "es hat nicht funktioniert" → sondern "du hast heimlich gegooglet ob du der einzige bist dem das nicht gelingt." Mindestens ZWEI Slides müssen exakt nach dieser Formel getextet sein.
- KOMMENTAR-ZWANG: Mindestens EINE Slide (nicht die letzte) muss eine Aussage enthalten, die zwei Lager aufspaltet — eine leicht kontroverse These oder Entweder-Oder-Behauptung, auf die man antworten MUSS (entweder zustimmen oder widersprechen). Kein "stimmt ihr zu?" — eine echte Aussage die reibt.
- EINE Idee pro Slide. Kurz, gesprochen, wie zu einer guten Freundin. Keine Schachtelsätze, keine Werbesprache.
- SAVE-WÜRDIG: Mindestens eine Slide liefert einen konkreten, sofort nützlichen Tipp/Aha-Moment, den man sich speichern will.
- CTA NATIV & WERTBASIERT (nur letzte Slide): kein plumpes "Kauf jetzt". Stattdessen den konkreten Nutzen rahmen ("Die komplette Schritt-für-Schritt-Anleitung steht in '${book}'") + sanfter Handlungsimpuls. Es muss sich wie ein ehrlicher Tipp anfühlen, nicht wie Werbung.`
}

function buildPrompt(params) {
  const { bookTitle, niche, situation, hook, perspective, language, stylePreference, imageStylePreset } = params
  const languageLabel = language === 'de' ? 'Deutsch' : language === 'en' ? 'English' : language === 'es' ? 'Español' : language
  const perspectiveLabel =
    perspective === 'alternating'
      ? 'Wechselnde Perspektiven (Dialog zwischen zwei Personen)'
      : 'Eine Perspektive (innerer Monolog)'

  const isDialog = perspective === 'alternating'
  const settingSuggestion = pickRandomSetting()

  const textRules = isDialog
    ? `Regeln für den Text (DIALOG-Modus — PFLICHT):
- 6-8 Slides, jede hat ZWEI Sprechertexte
- SLIDE 1 ist der Scroll-Stopper: Person A stellt eine provokante/neugierig machende Aussage oder Frage, Person B reagiert so, dass man unbedingt weiterswipen muss
- "text": Aussage von Person A (erscheint OBEN) — MAXIMAL 5 WÖRTER, eine einzige Zeile, kein Zeilenumbruch
- "text2": Reaktion von Person B (erscheint UNTEN) — MAXIMAL 5 WÖRTER, eine einzige Zeile, kein Zeilenumbruch
- Kein "A:" / "B:"-Prefix, nur den reinen kurzen Satz
- Jede Slide baut Spannung auf die nächste auf (offene Schleife) — extrem knapp, konkret, emotional
- Letzter Slide: text = nativer, wertbasierter Hinweis auf "${bookTitle}" (max. 5 Wörter), text2 = sanfter Handlungsimpuls (max. 5 Wörter)`
    : `Regeln für den Text (MONOLOG-Modus):
- 6-10 kurze Slides, jede max. 2-3 Zeilen in "text"
- "text2" IMMER leer lassen: ""
- SLIDE 1 ist der Scroll-Stopper (siehe Experten-Regeln): EIN konkreter, nervtreffender Satz — kein Vorgeplänkel, keine Begrüßung
- Jede Slide endet mit einer offenen Schleife, die zum Weiterswipen zwingt
- Sehr kurze, gesprochene, KONKRETE Sätze (Zahlen, sensorische Details) statt Floskeln
- Mindestens eine Slide ist save-würdig (konkreter Tipp/Aha-Moment)
- Letzter Slide: nativer, wertbasierter Call-to-Action für "${bookTitle}" — fühlt sich wie ein ehrlicher Tipp an, nicht wie Werbung`

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

${buildViralMechanics(bookTitle)}

VORARBEIT PFLICHT — bevor du einen einzigen Slide schreibst:
Stelle dir vor, du bist diese Person: Jemand aus der Nische "${niche}", mitten in der Situation "${situation}".
Was geht ihr still durch den Kopf — nicht was sie in einem Kommentar schreiben würde, sondern was sie denkt wenn sie allein ist und das Problem nicht zuzugeben traut?
Welche Sätze wiederholt sie innerlich? Welche stille Scham oder Sehnsucht trägt sie mit sich?
Diese innere Stimme ist die Tonlage für ALLE Slides.

${textRules}

Regeln für den durchgängigen Bild-Stil (visualStyle):
- Definiere EINEN einzigen, durchgängigen visuellen Stil für die GESAMTE Slideshow${stylePreference ? `\n- PFLICHT: Der Kunst-/Bildstil MUSS sein: "${stylePreference}". Baue den gesamten visualStyle um diesen Stil herum auf und erwähne ihn explizit.` : ''}
- VERBOT: Greife NICHT automatisch auf "Person in einer Küche" zurück — das ist die Standard-Falle. Vorschlag für Setting & Hauptfigur dieser Slideshow (nutze es, wenn es zur Situation "${situation}" passt, oder ersetze es durch etwas Passenderes — Hauptsache es ist NICHT die übliche Küchen-Szene): Setting = "${settingSuggestion.setting}", Hauptfigur = "${settingSuggestion.character}"
- Dieser Stil beschreibt: Bildstil/Medium (z.B. cinematic photo, warm film look), Farbpalette, Licht/Stimmung, wiederkehrende Hauptfigur (gleiches Aussehen, Kleidung), ein gemeinsamer Setting-Rahmen — aber mit Raum für unterschiedliche Bereiche, Kamerawinkel und Einstellungsgrößen pro Slide (siehe Bild-Varianz-Regeln unten)
- Sehr konkret und detailliert, damit alle Bilder wie aus EINER Serie wirken
- Auf Englisch

Regeln für die Bild-Prompts:
- JEDE Slide bekommt einen EIGENEN, individuellen Bild-Prompt (imagePrompt)
- WICHTIG: Jeder imagePrompt MUSS zum definierten visualStyle passen (gleiche Figur wenn sichtbar, gleiche Farben, gleiches Licht, gleicher Setting-Rahmen) — es soll wie dieselbe Bildserie aussehen
- Es ändert sich die konkrete Szene/Handlung passend zum Text dieser Slide UND die Einstellungsgröße/der Kamerawinkel (siehe unten) — NICHT jede Slide zeigt dieselbe Frontalansicht derselben Person am selben Fleck
${imageStylePreset === 'photorealistic'
  ? `- PFLICHT-STRUKTUR für jeden imagePrompt (auf Englisch — fotorealistisch-filmisch):
  0. Shot-Type: lege bewusst eine andere Einstellungsgröße fest als die vorherige Slide (siehe Bild-Varianz-Regeln)
  1. Location: "in a [spezifischer authentischer Ort, ggf. anderer Bereich desselben Settings]"
  2. Scene: "Show [bei Personen-Shots: Figur mit genauem Alter, Geschlecht, Kleidung — Farbe/Material/Schnitt, Körperhaltung/Pose, Mimik — ODER bei gesichtsfreien Shots: nur Hände/Objekt/Detail, KEIN Gesicht] [konkrete Handlung] [sensorische Details: Licht, Texturen, Props]"
  3. Atmosphere: "[Stimmung], natural daylight or soft window light, photorealistic 35mm film look, cinematic, not illustrated, not painted, not advertising"
- WICHTIG: Wenn eine Figur gezeigt wird, immer mit konkreter Kleidungsbeschreibung (z.B. "woman in her 30s wearing a faded blue denim shirt, loose linen pants, bare feet") und exakter Pose/Haltung (z.B. "leaning over the counter, both hands kneading dough")`
  : `- PFLICHT-STRUKTUR für jeden imagePrompt (auf Englisch — malerisch-künstlerisch):
  0. Shot-Type: lege bewusst eine andere Einstellungsgröße fest als die vorherige Slide (siehe Bild-Varianz-Regeln)
  1. Location: "in a [spezifischer Ort passend zum gewählten Setting, ggf. anderer Bereich desselben Settings]"
  2. Scene: "Show [bei Personen-Shots: Figur + emotionaler Zustand — ODER bei gesichtsfreien Shots: nur Hände/Objekt/Detail, KEIN Gesicht] [konkrete Handlung] [Objekt-Details: Textur, Zustand, Props]"
  3. Atmosphere: "[Stimmung], warm natural daylight, painterly texture, not glossy, not advertising, soft background blur"`}

Regeln für Bild-Varianz (PFLICHT — sonst wirkt die Slideshow eintönig und monoton):
- SHOT-TYPE ROTATION: Wechsle die Einstellungsgröße von Slide zu Slide bewusst durch, nutze nicht zweimal hintereinander dieselbe:
  1. Extreme Nahaufnahme/Makro: nur Hände, Objekt oder Detail, OHNE Gesicht (z.B. Hände im Teig, Brotkrume, Handy-Display, Notizbuch)
  2. Medium Shot: Person von der Hüfte aufwärts, in Handlung
  3. Weite/Establishing Shot: ganzer Raum sichtbar, Person klein im Bild
  4. Over-the-shoulder oder POV: Blick über die Schulter der Person, oder durch ihre Augen auf eine Szene/ein Objekt
  5. Flat-Lay von oben: Objekte/Essen von oben fotografiert, kein Gesicht sichtbar
- PFLICHT: Mindestens 2-3 Slides der gesamten Slideshow sind GESICHTSFREIE Detail-/Objekt-Shots (nur Hände, nur das Ergebnis/Objekt, nur ein Gegenstand) — nicht jede Slide braucht ein sichtbares Gesicht
- ORT-VARIANZ INNERHALB DES SETTINGS: Auch wenn Hauptfigur und Grundstil gleich bleiben, wechsle die konkrete Position/den Bereich (z.B. an der Arbeitsplatte, am Tisch, am Fenster, vor dem Ofen, auf dem Boden sitzend) — nicht jede Slide an derselben Stelle im selben Winkel
- KAMERAWINKEL VARIIEREN: nicht immer frontal auf Augenhöhe — auch leicht von oben, von unten, schräg von der Seite
- Sehr konkret und sensorisch: Textur des Teigs/Brots/Materials, Mehlstaub, nasse Hände, Holzoberflächen, etc.
- WICHTIG: NIEMALS Text, Wörter, Buchstaben, Beschriftungen oder Untertitel im Bild — der imagePrompt darf keinerlei Textinhalte aus "text" oder "text2" enthalten${isDialog ? '\n- DIALOG-MODUS: Jedes Bild MUSS ZWEI Personen zeigen — Person A im oberen Bildbereich, Person B im unteren Bildbereich sichtbar (Shot-Type-Rotation gilt hier für die gemeinsame Einstellungsgröße beider Personen)' : ''}

Regel für "showsBook" (Buch im Bild):
- Setze "showsBook" = true für JEDE Slide, in deren Szene ein Buch zu sehen ist (z.B. jemand hält ein Buch, liest darin, das Buch liegt auf dem Tisch)
- Bei diesen Slides: nenne das Buch im imagePrompt generisch als "the book" — beschreibe NICHT eine erfundene Buchgestaltung (Titel/Cover). Das echte Cover wird separat als Referenzbild eingefügt.
- Setze "showsBook" = false, wenn KEIN Buch in der Szene vorkommt
- Die letzte Slide (Kauf-Aufruf) zeigt typischerweise das Buch → showsBook = true

Regeln für den viralen Titel & die Beschreibung (basierend auf deiner Analyse oben):
- "title": EIN viraler, scroll-stoppender Titel für die gesamte Slideshow in ${languageLabel} (max. 8 Wörter). Greift denselben Nerv/Trigger wie Slide 1 auf — neugierig machend, konkret, kein Clickbait-Müll. Kein abschließender Punkt.
- "description": EINE kurze, knackige Beschreibung/Caption in ${languageLabel} (1-2 Sätze, max. ~200 Zeichen). Verstärkt den emotionalen Trigger, erzeugt Neugier und endet mit einem sanften Engagement-Impuls (z.B. eine Frage oder Aufforderung zum Speichern/Kommentieren). Passend zum Buch "${bookTitle}" und der Nische "${niche}".

Antworte NUR mit folgendem JSON (kein Markdown, kein Extra-Text):
{
  "slides": [${jsonExample}],
  "visualStyle": "ONE consistent visual style for ALL slides: medium, color palette, lighting, recurring character & setting",
  "hookSummary": "One sentence why this is viral",
  "title": "Viraler Titel der Slideshow (max. 8 Wörter)",
  "description": "Kurze, knackige Beschreibung/Caption (1-2 Sätze) mit Engagement-Impuls"
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
    hookSummary: result?.hookSummary || '',
    title: result?.title || '',
    description: result?.description || ''
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
      model: 'gemini-2.5-flash',
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
  const quality = settings.openaiImageQuality || 'medium'

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
      size: '1024x1536',
      quality
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
    size: '1024x1536',
    quality
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

  const prompt = `Du bist ein Top-1%-Experte für virales Social-Media-Storytelling. Reverse-engineere diese bereits viralen TikTok-Videos und leite eine Hook-Strategie für einen Buch-Slideshow-Post ab.

VIRALE VIDEOS (sortiert nach Reichweite):
${videoSummaries}

Erkenne zuerst das gemeinsame virale Muster: Welcher Hook-Typ, welche Spannungs-Mechanik und welcher emotionale Trigger wiederholen sich bei den erfolgreichsten Videos? Die Kennzahlen zeigen, was am stärksten performt.

Erstelle dann:
1. "hook": EINEN Scroll-Stopper als erste Slide — max. 1-2 sehr konkrete Sätze, die in <1 Sekunde einen Nerv treffen (Schmerz/Wunsch/Überraschung/verbotenes Wissen). KEIN Vorgeplänkel, keine Begrüßung. Nutze denselben Hook-Typ wie die viralen Originale.
2. "situation": kurze Situationsbeschreibung (1-2 Sätze), die den Hook motiviert — konkret, mit echtem Alltagsmoment.
3. "analysis": die extrahierte virale DNA in 1-2 Sätzen (Hook-Typ + stärkster Trigger + warum die Leute reagieren/teilen/speichern).

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

// Strip WEBVTT timestamps/headers, returning just the spoken text as clean paragraphs
function parseWebVtt(vtt) {
  if (!vtt) return ''
  const lines = vtt.split('\n')
  const out = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    if (t === 'WEBVTT') continue
    if (/^\d+$/.test(t)) continue                       // cue numbers
    if (t.includes('-->')) continue                     // timestamp lines
    if (/^(NOTE|STYLE|REGION)\b/.test(t)) continue
    out.push(t)
  }
  // Collapse consecutive duplicate lines (TikTok captions often repeat)
  const deduped = out.filter((l, i) => l !== out[i - 1])
  return deduped.join(' ')
}

export async function fetchTikTokTranscript({ videoUrl, language = 'de', useAiFallback = false, settings }) {
  const key = settings.scrapeCreatorsKey
  if (!key) throw new Error('Bitte ScrapeCreators API-Key in Einstellungen hinterlegen')
  if (!videoUrl) throw new Error('Keine Video-URL vorhanden')

  // use_ai_as_fallback transcribes via AI when no captions exist (costs ~10 credits, only <2min videos)
  const aiParam = useAiFallback ? '&use_ai_as_fallback=true' : ''
  const url = `https://api.scrapecreators.com/v1/tiktok/video/transcript?url=${encodeURIComponent(videoUrl)}&language=${encodeURIComponent(language)}${aiParam}`
  const res = await fetch(url, { headers: { 'x-api-key': key } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ScrapeCreators Fehler ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const raw = data?.transcript || ''
  const text = parseWebVtt(raw)
  if (!text.trim()) {
    throw new Error(useAiFallback
      ? 'Kein Transkript gefunden — auch der AI-Fallback lieferte nichts (Video evtl. länger als 2 Min.)'
      : 'Kein Transkript gefunden (keine Untertitel). Aktiviere den AI-Fallback und versuche es erneut.')
  }
  return { text, videoId: data?.id || '', url: data?.url || videoUrl }
}

export async function analyzeTranscriptForSlides({ transcript, stats, hasRealTranscript, bookTitle, language = 'de', stylePreference = '', perspective = 'single', settings }) {
  if (!settings.anthropicKey) throw new Error('Bitte Anthropic API-Key in Einstellungen hinterlegen')
  if (!transcript?.trim()) throw new Error('Kein Transkript vorhanden')

  const languageLabel = language === 'de' ? 'Deutsch' : language === 'en' ? 'English' : language
  const book = bookTitle?.trim() || 'mein Buch'
  const styleNote = stylePreference ? `\nBildstil: "${stylePreference}" — baue den visualStyle um diesen Stil auf.` : ''
  const isDialog = perspective === 'alternating'
  const settingSuggestion = pickRandomSetting()

  const slideRules = isDialog
    ? `- DIALOG-MODUS: 8-10 Slides, jede Slide hat ZWEI kurze Sprechertexte
- "text": Aussage Person A (erscheint OBEN) — MAXIMAL 8 WÖRTER, eine einzige Zeile, kein Zeilenumbruch
- "text2": Reaktion Person B (erscheint UNTEN) — MAXIMAL 8 WÖRTER, eine einzige Zeile, kein Zeilenumbruch
- Kein "A:"/"B:"-Prefix, nur den reinen kurzen Satz
- Slide 1: Person A mit demselben Scroll-Stopper-Hook-Typ wie im Original, Person B reagiert so dass man unbedingt weiterswipen muss
- Jede Slide baut Spannung auf die nächste auf (offene Schleife), extrem knapp, konkret, emotional
- Letzter Slide: text = nativer wertbasierter Hinweis auf "${book}" (max. 8 Wörter), text2 = sanfter Handlungsimpuls (max. 8 Wörter)
- "text2" enthält die Antwort von Person B — NIE leer lassen`
    : `- MONOLOG-MODUS: Erstelle 6-8 kurze Slides. Slide 1 = derselbe Scroll-Stopper-Typ wie im Original
- Jede Slide: offene Schleife zur nächsten, konkret statt generisch, eine Idee pro Slide
- Mindestens ZWEI Slides nach der „DAS BIN GENAU ICH"-Formel: KONKRETER MOMENT + INNERSTER GEDANKE + stille Scham oder Sehnsucht (z.B. statt "es war frustrierend" → "du hast heimlich gegooglet ob du der einzige bist dem das nicht gelingt")
- Mindestens EINE Slide (nicht die letzte) mit Kommentar-Zwang: eine leicht kontroverse These oder Entweder-Oder-Aussage, auf die man antworten MUSS — kein "stimmt ihr zu?", eine echte Aussage die reibt
- Letzter Slide: nativer, wertbasierter CTA für "${book}" (kein plumpes "Kauf jetzt" — ehrlicher Tipp-Ton)
- "text2" IMMER leer lassen: ""`

  const dialogImageNote = isDialog
    ? '\nDIALOG-PFLICHT: Jedes Bild MUSS ZWEI Personen zeigen — Person A im oberen Bildbereich, Person B im unteren Bildbereich (z.B. gegenüber an einem Tisch, oder zwei Bereiche in derselben Küche).'
    : ''
  const jsonSlideExample = isDialog
    ? `{"text":"Person A (max 8 Wörter)","text2":"Person B (max 8 Wörter)","label":"","imagePrompt":"...","showsBook":false}`
    : `{"text":"...","text2":"","label":"","imagePrompt":"...","showsBook":false}`

  const fmtNum = n => !n ? '0' : n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'K' : String(n)
  const statsNote = stats ? `\nViral-Kennzahlen dieses Videos: ${fmtNum(stats.views)} Aufrufe, ${fmtNum(stats.likes)} Likes, ${fmtNum(stats.comments)} Kommentare — nutze diese Zahlen um einzuschätzen WIE viral der Content ist und WARUM er so gut performt.` : ''
  const sourceNote = hasRealTranscript
    ? '\nDATENQUELLE: Dies ist ein ECHTES gesprochenes Transkript des Videos — analysiere Hook-Struktur, Spannungsbogen, Pausen, Storytelling und emotionale Trigger gründlich.'
    : '\nDATENQUELLE: Dies ist nur die Caption/Beschreibung, KEIN gesprochenes Transkript — sei im hookSummary ehrlich darüber, dass die Analyse auf begrenzten Daten basiert.'

  const prompt = `Du bist ein Top-1%-Experte für virales Social-Media-Storytelling und reverse-engineerst virale TikToks für Sachbücher.

VIDEO-CONTENT (bereits viral gegangen):
"""
${transcript.slice(0, 3000)}
"""
${statsNote}${sourceNote}

${buildViralMechanics(book)}

ARBEITE IN ZWEI SCHRITTEN:

SCHRITT 1 — VIRALE DNA EXTRAHIEREN (denke das gründlich durch, bevor du Slides baust):
- HOOK-TYP: Welches bewährte Muster nutzt Slide 1? (z.B. kontroverse Aussage, "Dinge die ich zu spät gelernt habe", POV, Vorher/Nachher, Fehler-Geständnis, "niemand redet über…", Mini-Story)
- SPANNUNGS-MECHANIK: Welche offene Frage hält die Zuschauer bis zum Ende? Warum swipen/schauen sie weiter?
- STÄRKSTER EMOTIONALER TRIGGER: Was genau löst die Reaktion aus (Identifikation, Schmerz, Sehnsucht, Aha, Kontroverse)?
- INNERE STIMME: Welche stillen Gedanken oder Sätze der Zielgruppe spricht dieses Video laut aus — Dinge, die man sonst nicht sagt aber ständig denkt? Diese exakte Tonlage und diese Formulierungen müssen in SCHRITT 2 übernommen werden.
- WARUM KOMMENTIEREN/TEILEN/SPEICHERN die Leute? (Die Kennzahlen geben Hinweise: hohe Like-/Kommentar-Rate = starker Trigger.)
→ Fasse diese DNA in EINEM prägnanten Satz im Feld "hookSummary" zusammen (das ist die Begründung der Viralität).

SCHRITT 2 — DIESELBE DNA FÜR "${book}" NACHBAUEN:
- Übernimm Hook-Typ, Spannungs-Mechanik und emotionalen Trigger 1:1 — aber mit Inhalten rund um "${book}" und das Thema des Buchs
${slideRules}
- Ausgabe-Sprache: ${languageLabel}${styleNote}

VERBOT: Greife NICHT automatisch auf "Person in einer Küche" zurück — das ist die Standard-Falle. Vorschlag für Setting & Hauptfigur (nutze es, wenn es zum Video-Content passt, oder ersetze es durch etwas Passenderes — Hauptsache es ist NICHT die übliche Küchen-Szene): Setting = "${settingSuggestion.setting}", Hauptfigur = "${settingSuggestion.character}"

Bild-Prompt Pflicht-Struktur (auf Englisch):
0. Shot-Type: lege bewusst eine andere Einstellungsgröße fest als die vorherige Slide (siehe Bild-Varianz-Regeln unten)
1. Location: "in a [spezifischer authentischer Ort, ggf. anderer Bereich desselben Settings]"
2. Scene: "Show [bei Personen-Shots: Figur + Emotion — ODER bei gesichtsfreien Shots: nur Hände/Objekt/Detail, KEIN Gesicht] [konkrete Handlung] [sensorische Details]"
3. Atmosphere: "[Stimmung], warm natural daylight, painterly texture, not glossy, not advertising"

Regeln für Bild-Varianz (PFLICHT — sonst wirkt die Slideshow eintönig und monoton):
- SHOT-TYPE ROTATION: Wechsle die Einstellungsgröße von Slide zu Slide bewusst durch, nutze nicht zweimal hintereinander dieselbe: 1. Extreme Nahaufnahme/Makro (nur Hände/Objekt/Detail, OHNE Gesicht), 2. Medium Shot (Person von der Hüfte aufwärts, in Handlung), 3. Weite/Establishing Shot (ganzer Raum sichtbar, Person klein im Bild), 4. Over-the-shoulder/POV, 5. Flat-Lay von oben (Objekte ohne Gesicht)
- PFLICHT: Mindestens 2-3 Slides der gesamten Slideshow sind GESICHTSFREIE Detail-/Objekt-Shots
- ORT-VARIANZ INNERHALB DES SETTINGS: konkrete Position/Bereich wechseln (z.B. Arbeitsplatte, Tisch, Fenster, Boden), nicht jede Slide an derselben Stelle
- KAMERAWINKEL VARIIEREN: nicht immer frontal auf Augenhöhe — auch leicht von oben, von unten, schräg von der Seite
NIEMALS Text/Wörter/Buchstaben im Bild. "showsBook" = true wenn ein Buch sichtbar ist.${dialogImageNote}

Erstelle außerdem (basierend auf der extrahierten viralen DNA):
- "title": EIN viraler, scroll-stoppender Titel für die Slideshow in ${languageLabel} (max. 8 Wörter, kein abschließender Punkt)
- "description": EINE kurze, knackige Caption in ${languageLabel} (1-2 Sätze, max. ~200 Zeichen) mit Engagement-Impuls (Frage/Aufforderung), passend zu "${book}"

Antworte NUR mit diesem JSON (kein Markdown):
{
  "slides": [${jsonSlideExample}],
  "visualStyle": "ONE consistent visual style for ALL slides",
  "hookSummary": "Die extrahierte virale DNA in einem Satz (Hook-Typ + Trigger + warum es funktioniert)",
  "title": "Viraler Titel der Slideshow (max. 8 Wörter)",
  "description": "Kurze, knackige Caption (1-2 Sätze) mit Engagement-Impuls"
}`

  const client = new Anthropic({ apiKey: settings.anthropicKey })
  const msg = await withRetry(() => client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [{ name: 'create_slideshow', description: 'Create TikTok slideshow from transcript', input_schema: POST_SCHEMA }],
    tool_choice: { type: 'tool', name: 'create_slideshow' },
    messages: [{ role: 'user', content: prompt }]
  }))

  const toolBlock = (msg.content || []).find(b => b.type === 'tool_use' && b.name === 'create_slideshow')
  if (toolBlock?.input) {
    const result = toolBlock.input
    const slides = extractSlides(result.slides)
    if (slides.length) {
      result.slides = slides.slice(0, 12)
      return result
    }
  }

  // fallback to text parsing
  const textBlock = (msg.content || []).find(b => b.type === 'text')
  const parsed = parseAIResponse(textBlock?.text || '')
  const fallbackSlides = extractSlides(parsed?.slides)
  if (!fallbackSlides.length) throw new Error('KI konnte keine Slides aus dem Transkript erstellen')
  parsed.slides = fallbackSlides.slice(0, 12)
  return parsed
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
