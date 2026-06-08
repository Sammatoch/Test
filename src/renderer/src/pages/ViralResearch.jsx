import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Heart, Play, MessageCircle, Loader2, ArrowRight, AlertCircle, FileText, ChevronDown, ChevronUp, Wand2 } from 'lucide-react'

const fmt = n => {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return Math.round(n / 1000) + 'K'
  return String(n)
}

function VideoCard({ video, index, selected, onClick }) {
  const text = video.text || video.description || ''
  const views = video.playCount || video.stats?.playCount || 0
  const likes = video.diggCount || video.stats?.diggCount || 0
  const comments = video.commentCount || video.stats?.commentCount || 0
  const author = video.authorMeta?.name || video.author?.uniqueId || ''
  const hashtags = (video.hashtags || []).slice(0, 4).map(h => `#${h.name || h}`).join(' ')

  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 cursor-pointer transition-colors ${
        selected
          ? 'bg-tiktok-cyan/5 border-tiktok-cyan/50'
          : 'bg-tiktok-surface border-tiktok-border hover:border-white/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
          selected ? 'bg-tiktok-cyan/20 text-tiktok-cyan' : 'bg-tiktok-red/20 text-tiktok-red'
        }`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm leading-snug line-clamp-3">{text || 'Kein Text'}</p>
          {hashtags && <p className="text-tiktok-cyan text-xs mt-1 truncate">{hashtags}</p>}
          {author && <p className="text-tiktok-muted text-xs mt-1">@{author}</p>}
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-xs text-tiktok-muted">
              <Play size={11} /> {fmt(views)}
            </span>
            <span className="flex items-center gap-1 text-xs text-tiktok-muted">
              <Heart size={11} /> {fmt(likes)}
            </span>
            <span className="flex items-center gap-1 text-xs text-tiktok-muted">
              <MessageCircle size={11} /> {fmt(comments)}
            </span>
            <span className={`ml-auto text-xs font-medium flex items-center gap-1 ${selected ? 'text-tiktok-cyan' : 'text-tiktok-muted'}`}>
              <FileText size={11} />
              {selected ? 'Ausgewählt' : 'Analysieren'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function getVideoUrl(video) {
  // Prefer an explicit URL field from Apify; otherwise construct from author + id
  if (video.webVideoUrl) return video.webVideoUrl
  if (video.videoUrl) return video.videoUrl
  const author = video.authorMeta?.name || video.author?.uniqueId || video.authorMeta?.uniqueId
  const id = video.id || video.videoId
  if (author && id) return `https://www.tiktok.com/@${author}/video/${id}`
  return ''
}

function VideoDetailPanel({ video, onClose, onSlidesGenerated }) {
  const text = video.text || video.description || ''
  const hashtags = (video.hashtags || []).map(h => `#${h.name || h}`).join(' ')
  const views = video.playCount || video.stats?.playCount || 0
  const likes = video.diggCount || video.stats?.diggCount || 0
  const comments = video.commentCount || video.stats?.commentCount || 0
  const videoUrl = getVideoUrl(video)

  const [transcript, setTranscript] = useState(
    [text, hashtags].filter(Boolean).join('\n\n')
  )
  const [bookTitle, setBookTitle] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [fetchingTranscript, setFetchingTranscript] = useState(false)
  const [transcriptLoaded, setTranscriptLoaded] = useState(false)
  const [useAiFallback, setUseAiFallback] = useState(false)
  const [error, setError] = useState('')

  const handleFetchTranscript = async () => {
    if (!videoUrl) { setError('Keine Video-URL ermittelbar'); return }
    setError('')
    setFetchingTranscript(true)
    try {
      const result = await window.api.viral.fetchTranscript({ videoUrl, language: 'de', useAiFallback })
      if (result?.text) {
        setTranscript(result.text)
        setTranscriptLoaded(true)
      } else {
        throw new Error('Kein Transkript erhalten')
      }
    } catch (e) {
      setError(e.message || 'Fehler beim Laden des Transkripts')
    } finally {
      setFetchingTranscript(false)
    }
  }

  const handleAnalyze = async () => {
    if (!transcript.trim()) return
    setError('')
    setAnalyzing(true)
    try {
      const result = await window.api.viral.analyzeVideo({
        transcript,
        stats: { views, likes, comments },
        hasRealTranscript: transcriptLoaded,
        bookTitle: bookTitle.trim() || undefined,
        language: 'de',
        stylePreference: ''
      })
      if (!result?.slides?.length) throw new Error('Keine Slides generiert')
      onSlidesGenerated(result)
    } catch (e) {
      setError(e.message || 'Fehler bei der Analyse')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="mt-2 bg-black/60 border border-tiktok-cyan/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-tiktok-cyan uppercase tracking-wider">Transkript analysieren</p>
        <button onClick={onClose} className="text-tiktok-muted hover:text-white text-xs">✕</button>
      </div>

      <button
        onClick={handleFetchTranscript}
        disabled={fetchingTranscript || !videoUrl}
        className="w-full flex items-center justify-center gap-2 py-2 bg-tiktok-red/10 hover:bg-tiktok-red/20 border border-tiktok-red/40 text-tiktok-red rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        title={videoUrl ? 'Lädt das echte gesprochene Transkript via ScrapeCreators' : 'Keine Video-URL verfügbar'}
      >
        {fetchingTranscript ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        {fetchingTranscript ? 'Lade Transkript...' : transcriptLoaded ? 'Transkript neu laden' : 'Echtes Transkript laden'}
      </button>

      <label className="flex items-center gap-2 cursor-pointer select-none px-1">
        <input
          type="checkbox"
          checked={useAiFallback}
          onChange={e => setUseAiFallback(e.target.checked)}
          className="accent-tiktok-red w-3.5 h-3.5"
        />
        <span className="text-[11px] text-tiktok-muted">
          KI-Fallback nutzen wenn keine Untertitel <span className="opacity-60">(transkribiert per AI, kostet mehr Credits, nur Videos &lt; 2 Min.)</span>
        </span>
      </label>

      <div className={`rounded-lg p-2.5 border text-xs leading-relaxed ${
        transcriptLoaded
          ? 'bg-tiktok-cyan/5 border-tiktok-cyan/30 text-tiktok-cyan'
          : 'bg-black/40 border-tiktok-border text-tiktok-muted'
      }`}>
        {transcriptLoaded ? (
          <><span className="font-medium">✓ Echtes Transkript geladen</span> — der gesprochene Text wurde via ScrapeCreators abgerufen. Die Analyse ist jetzt deutlich aussagekräftiger.</>
        ) : (
          <><span className="text-yellow-400 font-medium">Hinweis:</span> Das Feld unten enthält nur die <span className="text-white">Caption</span>. Klicke <span className="text-tiktok-red font-medium">„Echtes Transkript laden"</span> für den gesprochenen Text (benötigt ScrapeCreators API-Key in den Einstellungen).</>
        )}
      </div>

      <div>
        <p className="text-[11px] text-tiktok-muted mb-1">Caption / Transkript <span className="opacity-60">(bearbeitbar)</span></p>
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          rows={6}
          placeholder="Füge hier das vollständige Transkript des gesprochenen Texts ein..."
          className="w-full bg-black border border-tiktok-border rounded-lg px-3 py-2 text-white text-xs leading-snug focus:outline-none focus:border-tiktok-cyan resize-none placeholder-tiktok-muted"
        />
      </div>

      <div>
        <p className="text-[11px] text-tiktok-muted mb-1">Buchtitel <span className="opacity-60">(optional)</span></p>
        <input
          type="text"
          value={bookTitle}
          onChange={e => setBookTitle(e.target.value)}
          placeholder="z.B. Mein Sauerteigbuch"
          className="w-full bg-black border border-tiktok-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-tiktok-cyan placeholder-tiktok-muted"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-red-400 text-xs">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={analyzing || !transcript.trim()}
        className="w-full flex items-center justify-center gap-2 py-2 bg-tiktok-cyan/10 hover:bg-tiktok-cyan/20 border border-tiktok-cyan/40 text-tiktok-cyan rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
      >
        {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
        {analyzing ? 'Slides werden erstellt...' : 'Slides mit KI erstellen'}
      </button>
    </div>
  )
}

function GeneratedSlidesPreview({ result, onUseInGenerator }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-2 bg-tiktok-surface border border-tiktok-red/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-tiktok-red uppercase tracking-wider">
          {result.slides.length} Slides generiert
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-tiktok-muted hover:text-white text-xs flex items-center gap-1"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Einklappen' : 'Vorschau'}
          </button>
          <button
            onClick={onUseInGenerator}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-tiktok-red hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Im Generator verwenden
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {result.hookSummary && (
        <p className="text-tiktok-muted text-xs italic">{result.hookSummary}</p>
      )}

      {expanded && (
        <div className="space-y-1.5 pt-1">
          {result.slides.map((slide, i) => (
            <div key={i} className="bg-black/40 rounded-lg px-3 py-2 border border-tiktok-border">
              <p className="text-white text-xs leading-snug">{slide.text}</p>
              {slide.imagePrompt && (
                <p className="text-tiktok-muted text-[11px] italic mt-1 line-clamp-1">{slide.imagePrompt}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SESSION_KEY = 'tiktok-viral-session'

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}
function saveSession(data) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch { /* noop */ }
}

export default function ViralResearch() {
  const navigate = useNavigate()
  const hydrated = useRef(false)
  const [query, setQuery] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [videos, setVideos] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')

  const [selectedVideoIdx, setSelectedVideoIdx] = useState(null)
  const [videoResults, setVideoResults] = useState({})

  useEffect(() => {
    const saved = loadSession()
    if (saved) {
      if (saved.query) setQuery(saved.query)
      if (saved.maxResults) setMaxResults(saved.maxResults)
      if (saved.videos?.length) setVideos(saved.videos)
      if (saved.analysis) setAnalysis(saved.analysis)
    }
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    saveSession({ query, maxResults, videos, analysis })
  }, [query, maxResults, videos, analysis])

  const handleSearch = async () => {
    if (!query.trim()) return
    setError('')
    setLoading(true)
    setVideos([])
    setAnalysis(null)
    setSelectedVideoIdx(null)
    setVideoResults({})
    try {
      const results = await window.api.viral.scrape(query.trim(), maxResults)
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('Keine Videos gefunden. Versuche einen anderen Suchbegriff.')
      }
      const sorted = [...results].sort(
        (a, b) => (b.playCount || b.stats?.playCount || 0) - (a.playCount || a.stats?.playCount || 0)
      )
      setVideos(sorted)
    } catch (e) {
      setError(e.message || 'Fehler beim Laden der Videos')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setError('')
    setAnalyzing(true)
    try {
      const compact = videos.slice(0, 15).map(v => ({
        text: v.text || v.description || '',
        playCount: v.playCount || v.stats?.playCount || 0,
        diggCount: v.diggCount || v.stats?.diggCount || 0,
        hashtags: (v.hashtags || []).map(h => ({ name: h.name || h }))
      }))
      const result = await window.api.viral.analyze(compact)
      if (!result?.hook) throw new Error('Die KI-Analyse lieferte kein Ergebnis.')
      setAnalysis(result)
    } catch (e) {
      setError(e.message || 'Fehler bei der KI-Analyse')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleUseInGenerator = () => {
    navigate('/generator', { state: { hook: analysis.hook, situation: analysis.situation } })
  }

  const handleSelectVideo = (idx) => {
    setSelectedVideoIdx(selectedVideoIdx === idx ? null : idx)
  }

  const handleSlidesGenerated = (idx, result) => {
    setVideoResults(prev => ({ ...prev, [idx]: result }))
  }

  const handleUseVideoSlides = (idx) => {
    const result = videoResults[idx]
    if (!result) return
    navigate('/generator', {
      state: {
        slides: result.slides,
        visualStyle: result.visualStyle,
        hookSummary: result.hookSummary,
        title: result.title,
        description: result.description
      }
    })
  }

  const displayVideos = videos.slice(0, 10)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 py-5 border-b border-tiktok-border">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={20} className="text-tiktok-red" />
          <h2 className="text-white font-bold text-base">Viral Research</h2>
          <span className="text-xs text-tiktok-muted bg-tiktok-surface border border-tiktok-border rounded px-2 py-0.5">via Apify</span>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleSearch()}
            placeholder="TikTok-Suche, z.B. 'Sauerteig backen viral'"
            className="flex-1 bg-black border border-tiktok-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-tiktok-red placeholder-tiktok-muted"
          />
          <select
            value={maxResults}
            onChange={e => setMaxResults(Number(e.target.value))}
            className="bg-black border border-tiktok-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-tiktok-red"
          >
            <option value={10}>10 Videos</option>
            <option value={20}>20 Videos</option>
            <option value={30}>30 Videos</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-tiktok-red hover:bg-red-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Suchen
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && videos.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-tiktok-muted">
            <TrendingUp size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Noch keine Ergebnisse.</p>
            <p className="text-xs mt-1">Gib einen Suchbegriff ein und klicke Suchen.</p>
            <p className="text-xs mt-3 text-center max-w-xs opacity-60">
              Apify API-Key muss in den Einstellungen hinterlegt sein.
            </p>
          </div>
        )}

        {videos.length > 0 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-white font-medium">{videos.length} Videos gefunden
                  <span className="text-tiktok-muted text-xs font-normal ml-2">· Klicke ein Video um Slides daraus zu erstellen</span>
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-tiktok-cyan/10 hover:bg-tiktok-cyan/20 border border-tiktok-cyan/30 text-tiktok-cyan rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                  {analyzing ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
                  {analyzing ? 'Analysiere...' : 'Alle analysieren'}
                </button>
              </div>
              <div className="space-y-2">
                {displayVideos.map((video, i) => (
                  <div key={video.id || i}>
                    <VideoCard
                      video={video}
                      index={i}
                      selected={selectedVideoIdx === i}
                      onClick={() => handleSelectVideo(i)}
                    />
                    {selectedVideoIdx === i && !videoResults[i] && (
                      <VideoDetailPanel
                        video={video}
                        onClose={() => setSelectedVideoIdx(null)}
                        onSlidesGenerated={(result) => handleSlidesGenerated(i, result)}
                      />
                    )}
                    {videoResults[i] && (
                      <GeneratedSlidesPreview
                        result={videoResults[i]}
                        onUseInGenerator={() => handleUseVideoSlides(i)}
                      />
                    )}
                  </div>
                ))}
                {videos.length > 10 && (
                  <p className="text-xs text-tiktok-muted text-center pt-1">
                    +{videos.length - 10} weitere Videos wurden für die Analyse verwendet
                  </p>
                )}
              </div>
            </div>

            {analysis && (
              <div className="bg-tiktok-surface border border-tiktok-cyan/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-tiktok-cyan uppercase tracking-wider">KI-Analyse (alle Videos)</h3>
                  <button
                    onClick={handleUseInGenerator}
                    className="flex items-center gap-2 px-4 py-2 bg-tiktok-red hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Im Generator verwenden
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-tiktok-muted uppercase tracking-wider mb-1">Empfohlener Hook</p>
                    <p className="text-white text-sm font-medium bg-black/40 rounded-lg p-3 border border-tiktok-border">{analysis.hook}</p>
                  </div>
                  <div>
                    <p className="text-xs text-tiktok-muted uppercase tracking-wider mb-1">Empfohlene Situation</p>
                    <p className="text-white text-sm bg-black/40 rounded-lg p-3 border border-tiktok-border">{analysis.situation}</p>
                  </div>
                  {analysis.analysis && (
                    <div>
                      <p className="text-xs text-tiktok-muted uppercase tracking-wider mb-1">Warum viral?</p>
                      <p className="text-tiktok-muted text-sm bg-black/40 rounded-lg p-3 border border-tiktok-border">{analysis.analysis}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
