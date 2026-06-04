import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Wand2, ChevronLeft, ChevronRight, Image, FolderOpen,
  Download, Copy, Check, Loader2, Save, Plus, Zap
} from 'lucide-react'
import TikTokPreview from '../components/TikTokPreview.jsx'
import { renderSlideToDataURL } from '../lib/renderSlide.js'

const LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' }
]

const PROVIDERS = [
  { value: 'anthropic', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'GPT-4o (OpenAI)' },
  { value: 'gemini', label: 'Gemini (Google)' }
]

function InputRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-tiktok-muted mb-1 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full bg-black border border-tiktok-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-tiktok-red placeholder-tiktok-muted'

const selectClass =
  'w-full bg-black border border-tiktok-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-tiktok-red'

export default function Generator() {
  const location = useLocation()
  const canvasRef = useRef(null)

  const [settings, setSettings] = useState({})
  const [books, setBooks] = useState([])
  const [hooks, setHooks] = useState([])

  const [bookTitle, setBookTitle] = useState('')
  const [niche, setNiche] = useState('')
  const [situation, setSituation] = useState('')
  const [hook, setHook] = useState('')
  const [perspective, setPerspective] = useState('single')
  const [language, setLanguage] = useState('de')
  const [provider, setProvider] = useState('anthropic')

  const [slides, setSlides] = useState([])
  const [hookSummary, setHookSummary] = useState('')
  const [currentSlide, setCurrentSlide] = useState(0)

  const [visualStyle, setVisualStyle] = useState('')
  const [imageProvider, setImageProvider] = useState('openai')
  const [slideImages, setSlideImages] = useState([])
  const [imageProgress, setImageProgress] = useState(null)
  const [consistencyMode, setConsistencyMode] = useState(true)
  const [refFolders, setRefFolders] = useState([])
  const [selectedRefFolder, setSelectedRefFolder] = useState('')
  const [referenceImages, setReferenceImages] = useState([])
  const [loadingRefs, setLoadingRefs] = useState(false)
  const [indexedTexts, setIndexedTexts] = useState([])
  const [useIndexing, setUseIndexing] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)

  const [generating, setGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatingSlideIdx, setGeneratingSlideIdx] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showHookDropdown, setShowHookDropdown] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.settings.get(),
      window.api.books.get(),
      window.api.hooks.get()
    ]).then(([s, b, h]) => {
      setSettings(s || {})
      setBooks(b || [])
      setHooks(h || [])
      if (s) {
        setBookTitle(s.defaultBookTitle || '')
        setNiche(s.defaultNiche || '')
        setLanguage(s.defaultLanguage || 'de')
        setProvider(s.defaultProvider || 'anthropic')
      }
    })
  }, [])

  useEffect(() => {
    if (location.state?.hook) setHook(location.state.hook)
    if (location.state?.situation) setSituation(location.state.situation)
  }, [location.state])

  useEffect(() => {
    const base = settings.referenceBaseDir
    if (!base) { setRefFolders([]); return }
    window.api.references.listFolders(base).then(setRefFolders).catch(() => setRefFolders([]))
  }, [settings.referenceBaseDir])

  const composeImagePrompt = (slide) => {
    const scene = slide.imagePrompt || slide.text
    // Gemini Imagen only takes plain text prompts — the AI already writes consistent
    // prompts per slide, so no prefix needed. The visual style prefix is only used
    // for OpenAI where it improves anchor-based consistency.
    if (imageProvider === 'gemini' || !visualStyle) return scene
    return `Consistent visual style for the entire image series: ${visualStyle}. Scene for this slide: ${scene}. Vertical 9:16 portrait, cinematic.`
  }

  const handleSelectRefFolder = async (folderPath) => {
    setSelectedRefFolder(folderPath)
    setReferenceImages([])
    if (!folderPath) return
    setLoadingRefs(true)
    try {
      const files = await window.api.references.listImages(folderPath)
      const loaded = []
      for (const f of files.slice(0, 6)) {
        const b64 = await window.api.references.readAsBase64(f.path)
        if (b64) loaded.push(b64)
      }
      setReferenceImages(loaded)
      if (!loaded.length) setError('Im gewählten Ordner wurden keine Bilder gefunden.')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingRefs(false)
    }
  }

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  const handleGenerate = async () => {
    if (!bookTitle.trim() || !situation.trim() || !hook.trim()) {
      setError('Bitte Buchtitel, Situation und Hook ausfüllen.')
      return
    }
    setError('')
    setGenerating(true)
    setSlides([])
    setHookSummary('')
    setVisualStyle('')
    setSlideImages([])
    setIndexedTexts([])
    setCurrentSlide(0)
    try {
      const result = await window.api.generate.content({
        bookTitle, niche, situation, hook, perspective, language, provider
      })
      // Robustly locate the slides array regardless of returned shape
      let raw = result?.slides ?? result
      // The model sometimes returns slides as a JSON-encoded string (double encoding)
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw) } catch { /* leave as-is */ }
      }
      let slidesArray
      if (Array.isArray(raw)) {
        slidesArray = raw
      } else if (raw && typeof raw === 'object') {
        slidesArray = Object.values(raw)
      } else {
        slidesArray = []
      }
      const normalized = slidesArray
        .map(s => (typeof s === 'string'
          ? { text: s, label: '', imagePrompt: '' }
          : { text: s?.text ?? '', label: s?.label ?? '', imagePrompt: s?.imagePrompt ?? '' }))
        .filter(s => s.text && s.text.trim())
      if (!normalized.length) {
        setError('Die KI hat keine verwertbaren Slides zurückgegeben. Antwort: ' + JSON.stringify(result).slice(0, 300))
        return
      }
      setSlides(normalized)
      setSlideImages(new Array(normalized.length).fill(null))
      setHookSummary(result?.hookSummary || '')
      setVisualStyle(result?.visualStyle || '')
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleApplyIndexing = async () => {
    if (!slides.length) return
    const indexed = await Promise.all(
      slides.map(s => window.api.generate.tiktokText(s.text))
    )
    setIndexedTexts(indexed)
    setUseIndexing(true)
  }

  const getDisplayText = (slide, idx) => {
    if (useIndexing && indexedTexts[idx]) return indexedTexts[idx]
    return slide.text
  }

  const handleCopy = async (text, idx) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  const handleGenerateAllImages = async () => {
    if (!slides.length) return
    setError('')
    setGeneratingImage(true)
    setImageProgress({ done: 0, total: slides.length })
    try {
      const images = [...slideImages]
      let anchor = null
      for (let i = 0; i < slides.length; i++) {
        const prompt = composeImagePrompt(slides[i])
        // Gemini Imagen doesn't support reference images — consistency comes from the AI prompts
        const refs = imageProvider === 'gemini' ? [] : [...referenceImages]
        if (imageProvider !== 'gemini' && consistencyMode && anchor) refs.unshift(anchor)
        const b64 = await window.api.generate.image(prompt, imageProvider, refs.length ? refs : null)
        images[i] = b64
        if (consistencyMode && i === 0) anchor = b64
        setSlideImages([...images])
        setImageProgress({ done: i + 1, total: slides.length })
        // Small pause between requests to avoid hitting provider rate limits
        if (i < slides.length - 1) {
          await new Promise(r => setTimeout(r, 1500))
        }
      }
    } catch (e) {
      setError(`Bild ${(imageProgress?.done ?? 0) + 1}: ${e.message}`)
    } finally {
      setGeneratingImage(false)
      setImageProgress(null)
    }
  }

  const handleGenerateSlideImage = async (idx) => {
    if (!slides[idx]) return
    const prompt = composeImagePrompt(slides[idx])
    if (!prompt) return
    setError('')
    setGeneratingSlideIdx(idx)
    try {
      const refs = imageProvider === 'gemini' ? [] : [...referenceImages]
      if (imageProvider !== 'gemini' && consistencyMode) {
        const sibling = slideImages.find((img, i) => img && i !== idx)
        if (sibling) refs.unshift(sibling)
      }
      const b64 = await window.api.generate.image(prompt, imageProvider, refs.length ? refs : null)
      setSlideImages(prev => {
        const next = [...prev]
        next[idx] = b64
        return next
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setGeneratingSlideIdx(null)
    }
  }

  const handleExport = async () => {
    if (!slides.length) return
    setExporting(true)
    try {
      const stamp = Date.now()
      let lastPath = ''
      for (let i = 0; i < slides.length; i++) {
        const text = getDisplayText(slides[i], i)
        const dataUrl = await renderSlideToDataURL(text, i, slides.length, slideImages[i] || null)
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
        const num = String(i + 1).padStart(2, '0')
        lastPath = await window.api.export.post(base64, `tiktok_${stamp}_slide${num}.png`)
      }
      showSuccess(`${slides.length} Slides exportiert nach: ${lastPath.replace(/[^\\/]+$/, '')}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setExporting(false)
    }
  }

  const handleSaveImage = async () => {
    const current = slideImages[currentSlide]
    if (!current) return
    try {
      await window.api.images.saveFromBase64(current, slides[currentSlide]?.imagePrompt || '')
      showSuccess('Bild in Bibliothek gespeichert!')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleSavePost = async () => {
    if (!slides.length) return
    setSaving(true)
    try {
      const imagePaths = []
      for (let i = 0; i < slides.length; i++) {
        if (slideImages[i]) {
          const record = await window.api.images.saveFromBase64(slideImages[i], slides[i]?.imagePrompt || '')
          imagePaths[i] = await window.api.images.getFilePath(record.id)
        } else {
          imagePaths[i] = null
        }
      }
      await window.api.posts.save({
        bookTitle, niche, situation, hook, perspective, language,
        slides, imagePaths
      })
      showSuccess('Post gespeichert!')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveHook = async () => {
    if (!hook.trim()) return
    try {
      await window.api.hooks.save({ text: hook })
      const updated = await window.api.hooks.get()
      setHooks(updated)
      showSuccess('Hook gespeichert!')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleSelectHook = (h) => {
    setHook(h.text)
    setShowHookDropdown(false)
  }

  const handleLoadLibraryImage = async () => {
    const imgs = await window.api.images.get()
    if (!imgs.length) {
      setError('Keine Bilder in der Bibliothek.')
      return
    }
    const first = imgs[0]
    try {
      const b64 = await window.api.images.readAsBase64(first.id)
      if (b64) {
        setSlideImages(prev => {
          const next = [...prev]
          next[currentSlide] = b64
          return next
        })
      }
    } catch (e) {
      setError(e.message)
    }
  }

  const viralHooks = hooks.filter(h => h.isViral)

  return (
    <div className="h-full flex overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-72 shrink-0 border-r border-tiktok-border bg-tiktok-surface overflow-y-auto p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 size={16} className="text-tiktok-red" />
          <span className="text-sm font-semibold text-white">Content erstellen</span>
        </div>

        <InputRow label="Buchtitel">
          <input
            list="books-list"
            value={bookTitle}
            onChange={e => setBookTitle(e.target.value)}
            placeholder="z.B. Mein Sauerteig Backbuch"
            className={inputClass}
          />
          <datalist id="books-list">
            {books.map(b => <option key={b.id} value={b.title} />)}
          </datalist>
        </InputRow>

        <InputRow label="Nische">
          <input
            value={niche}
            onChange={e => setNiche(e.target.value)}
            placeholder="z.B. Backen / Sauerteig"
            className={inputClass}
          />
        </InputRow>

        <InputRow label="Situation">
          <textarea
            value={situation}
            onChange={e => setSituation(e.target.value)}
            placeholder="z.B. Jemand backt zum ersten Mal Brot und es geht schief..."
            rows={3}
            className={inputClass + ' resize-none'}
          />
        </InputRow>

        <InputRow label="Hook">
          <div className="relative">
            <input
              value={hook}
              onChange={e => setHook(e.target.value)}
              placeholder="z.B. Der Moment, wenn..."
              className={inputClass + ' pr-8'}
            />
            {hooks.length > 0 && (
              <button
                onClick={() => setShowHookDropdown(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-tiktok-muted hover:text-white"
                title="Gespeicherte Hooks"
              >
                <ChevronLeft size={14} className={`transition-transform ${showHookDropdown ? 'rotate-90' : '-rotate-90'}`} />
              </button>
            )}
          </div>
          {showHookDropdown && hooks.length > 0 && (
            <div className="mt-1 bg-black border border-tiktok-border rounded-lg overflow-hidden max-h-40 overflow-y-auto z-10">
              {viralHooks.length > 0 && (
                <div className="px-2 py-1 text-xs text-tiktok-red font-medium border-b border-tiktok-border">Viral</div>
              )}
              {viralHooks.map(h => (
                <button
                  key={h.id}
                  onClick={() => handleSelectHook(h)}
                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <Zap size={10} className="text-tiktok-red shrink-0" />
                  <span className="truncate">{h.text}</span>
                </button>
              ))}
              {hooks.filter(h => !h.isViral).map(h => (
                <button
                  key={h.id}
                  onClick={() => handleSelectHook(h)}
                  className="w-full text-left px-3 py-2 text-xs text-tiktok-muted hover:bg-white/5 hover:text-white truncate"
                >
                  {h.text}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleSaveHook}
            className="mt-1 flex items-center gap-1 text-xs text-tiktok-muted hover:text-tiktok-cyan transition-colors"
          >
            <Plus size={12} /> Hook speichern
          </button>
        </InputRow>

        <InputRow label="Perspektive">
          <div className="flex gap-2">
            {[
              { value: 'single', label: 'Monolog' },
              { value: 'alternating', label: 'Dialog' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setPerspective(opt.value)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                  perspective === opt.value
                    ? 'border-tiktok-red bg-tiktok-red/10 text-tiktok-red font-medium'
                    : 'border-tiktok-border text-tiktok-muted hover:text-white hover:border-white/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </InputRow>

        <div className="grid grid-cols-2 gap-2">
          <InputRow label="Sprache">
            <select value={language} onChange={e => setLanguage(e.target.value)} className={selectClass}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </InputRow>
          <InputRow label="Provider">
            <select value={provider} onChange={e => setProvider(e.target.value)} className={selectClass}>
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </InputRow>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-tiktok-red hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors mt-1"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {generating ? 'Generiere...' : 'Content generieren'}
        </button>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-tiktok-cyan/10 border border-tiktok-cyan/30 rounded-lg px-4 py-3 text-tiktok-cyan text-sm">
            {successMsg}
          </div>
        )}

        {slides.length === 0 && !generating && (
          <div className="flex-1 flex flex-col items-center justify-center text-tiktok-muted py-20">
            <Wand2 size={48} className="mb-4 opacity-30" />
            <p className="text-sm">Kein Content generiert.</p>
            <p className="text-xs mt-1">Fülle das Formular aus und klicke auf "Content generieren".</p>
          </div>
        )}

        {generating && (
          <div className="flex-1 flex flex-col items-center justify-center text-tiktok-muted py-20">
            <Loader2 size={36} className="animate-spin mb-4 text-tiktok-red" />
            <p className="text-sm">Content wird generiert...</p>
          </div>
        )}

        {slides.length > 0 && !generating && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm">Generierte Slides</h3>
                {hookSummary && (
                  <p className="text-tiktok-muted text-xs mt-0.5 italic">"{hookSummary}"</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-tiktok-muted">TikTok-Indexing</span>
                  <button
                    onClick={useIndexing ? () => setUseIndexing(false) : handleApplyIndexing}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      useIndexing ? 'bg-tiktok-red' : 'bg-tiktok-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        useIndexing ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <button
                  onClick={handleSavePost}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-tiktok-cyan/10 hover:bg-tiktok-cyan/20 border border-tiktok-cyan/30 text-tiktok-cyan text-xs rounded-lg transition-colors"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Speichern
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {slides.map((slide, idx) => {
                const displayText = getDisplayText(slide, idx)
                const hasImage = !!slideImages[idx]
                return (
                  <div
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      currentSlide === idx
                        ? 'border-tiktok-red bg-tiktok-red/5'
                        : 'border-tiktok-border bg-tiktok-surface hover:border-tiktok-border/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        hasImage ? 'bg-tiktok-cyan/20 text-tiktok-cyan' : 'bg-tiktok-border text-tiktok-muted'
                      }`}>
                        {idx + 1}
                      </span>
                      <p className="flex-1 text-white text-sm leading-snug whitespace-pre-wrap">{displayText}</p>
                      <button
                        onClick={e => { e.stopPropagation(); handleCopy(displayText, idx) }}
                        className="shrink-0 p-1.5 rounded text-tiktok-muted hover:text-white transition-colors"
                        title="Kopieren"
                      >
                        {copiedIdx === idx ? <Check size={14} className="text-tiktok-cyan" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <div className="mt-2 pl-9 flex items-start gap-2">
                      {hasImage ? (
                        <img
                          src={'data:image/png;base64,' + slideImages[idx]}
                          alt=""
                          className="w-10 h-[71px] object-cover rounded-md border border-tiktok-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-[71px] rounded-md border border-dashed border-tiktok-border flex items-center justify-center shrink-0">
                          <Image size={14} className="text-tiktok-muted opacity-50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {slide.imagePrompt && (
                          <p className="text-tiktok-muted text-xs italic leading-snug line-clamp-2">{slide.imagePrompt}</p>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleGenerateSlideImage(idx) }}
                          disabled={generatingImage || generatingSlideIdx !== null}
                          className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            hasImage
                              ? 'border border-tiktok-border text-tiktok-muted hover:text-white hover:border-white/30'
                              : 'bg-tiktok-red/10 border border-tiktok-red/30 text-tiktok-red hover:bg-tiktok-red/20'
                          }`}
                          title="Bild für diese Slide generieren"
                        >
                          {generatingSlideIdx === idx
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Image size={12} />}
                          {generatingSlideIdx === idx
                            ? 'Generiere...'
                            : hasImage ? 'Neu generieren' : 'Bild generieren'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 shrink-0 border-l border-tiktok-border bg-tiktok-surface overflow-y-auto p-4 flex flex-col gap-4">
        <div>
          <p className="text-xs text-tiktok-muted uppercase tracking-wider mb-3">Vorschau</p>
          <div ref={canvasRef} className="flex justify-center">
            <TikTokPreview
              slides={slides}
              currentSlide={currentSlide}
              imageBase64={slideImages[currentSlide] || null}
            />
          </div>
        </div>

        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setCurrentSlide(i => Math.max(0, i - 1))}
              disabled={currentSlide === 0}
              className="p-2 rounded-lg border border-tiktok-border text-tiktok-muted hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-tiktok-muted">
              {currentSlide + 1} / {slides.length}
            </span>
            <button
              onClick={() => setCurrentSlide(i => Math.min(slides.length - 1, i + 1))}
              disabled={currentSlide === slides.length - 1}
              className="p-2 rounded-lg border border-tiktok-border text-tiktok-muted hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            {[
              { value: 'openai', label: 'OpenAI' },
              { value: 'gemini', label: 'Gemini' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setImageProvider(opt.value)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                  imageProvider === opt.value
                    ? 'border-tiktok-red bg-tiktok-red/10 text-tiktok-red font-medium'
                    : 'border-tiktok-border text-tiktok-muted hover:text-white hover:border-white/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-xs text-tiktok-muted" title="Nutzt das erste Bild als Stil-Anker für alle weiteren Slides">
              Konsistenz-Modus
            </span>
            <button
              onClick={() => setConsistencyMode(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                consistencyMode ? 'bg-tiktok-red' : 'bg-tiktok-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  consistencyMode ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {settings.referenceBaseDir ? (
            <div className="space-y-1.5">
              <label className="text-xs text-tiktok-muted uppercase tracking-wider">Referenzordner</label>
              <select
                value={selectedRefFolder}
                onChange={e => handleSelectRefFolder(e.target.value)}
                className={selectClass}
              >
                <option value="">Keine Referenz</option>
                {refFolders.map(f => (
                  <option key={f.path} value={f.path}>{f.name}</option>
                ))}
              </select>
              {loadingRefs && <p className="text-xs text-tiktok-muted">Lade Referenzbilder...</p>}
              {!loadingRefs && referenceImages.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {referenceImages.map((b64, i) => (
                    <img
                      key={i}
                      src={'data:image/png;base64,' + b64}
                      alt=""
                      className="w-8 h-8 object-cover rounded border border-tiktok-border"
                    />
                  ))}
                  <span className="text-xs text-tiktok-cyan ml-1">{referenceImages.length} Referenz(en) aktiv</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-tiktok-muted leading-snug">
              Tipp: Lege in den Einstellungen einen Referenz-Basisordner fest, um eigene Bilder als Stil-Referenz zu nutzen.
            </p>
          )}

          <button
            onClick={handleGenerateAllImages}
            disabled={generatingImage || generatingSlideIdx !== null || slides.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2 bg-tiktok-red hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            {generatingImage ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
            {generatingImage
              ? (imageProgress ? `Bild ${imageProgress.done}/${imageProgress.total}...` : 'Bild wird generiert...')
              : `Alle Bilder generieren (${imageProvider === 'gemini' ? 'Gemini' : 'OpenAI'})`}
          </button>

          {slideImages[currentSlide] && (
            <button
              onClick={handleSaveImage}
              className="w-full flex items-center justify-center gap-2 py-2 bg-tiktok-cyan/10 hover:bg-tiktok-cyan/20 border border-tiktok-cyan/30 text-tiktok-cyan text-xs font-medium rounded-lg transition-colors"
            >
              <Save size={14} />
              Aktuelles Bild speichern
            </button>
          )}

          <button
            onClick={handleLoadLibraryImage}
            className="w-full flex items-center justify-center gap-2 py-2 border border-tiktok-border hover:border-white/30 text-tiktok-muted hover:text-white text-xs font-medium rounded-lg transition-colors"
          >
            <FolderOpen size={14} />
            Bild aus Bibliothek laden
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || slides.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2 border border-tiktok-border hover:border-white/30 text-tiktok-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium rounded-lg transition-colors"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? 'Exportiere...' : 'Als PNG exportieren'}
          </button>
        </div>
      </div>
    </div>
  )
}
