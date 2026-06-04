import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Heart, Play, MessageCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react'

const fmt = n => {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return Math.round(n / 1000) + 'K'
  return String(n)
}

function VideoCard({ video, index }) {
  const text = video.text || video.description || ''
  const views = video.playCount || video.stats?.playCount || 0
  const likes = video.diggCount || video.stats?.diggCount || 0
  const comments = video.commentCount || video.stats?.commentCount || 0
  const author = video.authorMeta?.name || video.author?.uniqueId || ''
  const hashtags = (video.hashtags || []).slice(0, 4).map(h => `#${h.name || h}`).join(' ')

  return (
    <div className="bg-tiktok-surface border border-tiktok-border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-tiktok-red/20 text-tiktok-red text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ViralResearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [videos, setVideos] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setError('')
    setLoading(true)
    setVideos([])
    setAnalysis(null)
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
      const result = await window.api.viral.analyze(videos)
      setAnalysis(result)
    } catch (e) {
      setError(e.message || 'Fehler bei der KI-Analyse')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleUseInGenerator = () => {
    navigate('/generator', {
      state: { hook: analysis.hook, situation: analysis.situation }
    })
  }

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
                <p className="text-sm text-white font-medium">{videos.length} Videos gefunden</p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-tiktok-cyan/10 hover:bg-tiktok-cyan/20 border border-tiktok-cyan/30 text-tiktok-cyan rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                  {analyzing ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
                  {analyzing ? 'Analysiere...' : 'Mit KI analysieren'}
                </button>
              </div>
              <div className="space-y-2">
                {videos.slice(0, 10).map((video, i) => (
                  <VideoCard key={video.id || i} video={video} index={i} />
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
                  <h3 className="text-sm font-semibold text-tiktok-cyan uppercase tracking-wider">KI-Analyse</h3>
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
