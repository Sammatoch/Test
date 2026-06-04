import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Star, StarOff, ArrowRight, BookOpen, Zap, Image } from 'lucide-react'

function HooksTab() {
  const [hooks, setHooks] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    window.api.hooks.get().then(setHooks)
  }, [])

  const handleDelete = async (id) => {
    const updated = await window.api.hooks.delete(id)
    setHooks(updated)
  }

  const handleToggleViral = async (id) => {
    const updated = await window.api.hooks.toggleViral(id)
    setHooks(updated)
  }

  const handleUse = (hook) => {
    navigate('/generator', { state: { hook: hook.text } })
  }

  if (hooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-tiktok-muted">
        <Zap size={40} className="mb-3 opacity-40" />
        <p className="text-sm">Keine Hooks gespeichert.</p>
        <p className="text-xs mt-1">Generiere Inhalte und speichere Hooks in der Bibliothek.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {hooks.map(hook => (
        <div
          key={hook.id}
          className="flex items-center gap-3 bg-tiktok-surface border border-tiktok-border rounded-xl px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm leading-snug">{hook.text}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-tiktok-muted">{new Date(hook.createdAt).toLocaleDateString('de-DE')}</span>
              {hook.useCount > 0 && (
                <span className="text-xs text-tiktok-muted">{hook.useCount}x verwendet</span>
              )}
              {hook.isViral && (
                <span className="text-xs text-tiktok-red font-medium flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Viral
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleToggleViral(hook.id)}
              title={hook.isViral ? 'Viral-Mark entfernen' : 'Als viral markieren'}
              className={`p-2 rounded-lg transition-colors ${
                hook.isViral
                  ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10'
                  : 'text-tiktok-muted hover:text-yellow-400 hover:bg-white/5'
              }`}
            >
              {hook.isViral ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
            </button>
            <button
              onClick={() => handleUse(hook)}
              title="Im Generator verwenden"
              className="p-2 rounded-lg text-tiktok-cyan hover:bg-tiktok-cyan/10 transition-colors"
            >
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => handleDelete(hook.id)}
              title="Löschen"
              className="p-2 rounded-lg text-tiktok-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PostsTab() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    window.api.posts.get().then(setPosts)
  }, [])

  const handleDelete = async (id) => {
    const updated = await window.api.posts.delete(id)
    setPosts(updated)
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-tiktok-muted">
        <BookOpen size={40} className="mb-3 opacity-40" />
        <p className="text-sm">Keine Posts gespeichert.</p>
        <p className="text-xs mt-1">Generiere und speichere Posts im Generator.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {posts.map(post => {
        const thumb = (post.imagePaths && post.imagePaths.find(Boolean)) || post.imagePath
        return (
        <div
          key={post.id}
          className="bg-tiktok-surface border border-tiktok-border rounded-xl overflow-hidden"
        >
          {thumb && (
            <img
              src={'file://' + thumb}
              alt="Post Bild"
              className="w-full h-32 object-cover"
            />
          )}
          {!thumb && (
            <div className="w-full h-32 bg-gradient-to-br from-tiktok-red/20 to-tiktok-cyan/20 flex items-center justify-center">
              <BookOpen size={32} className="text-tiktok-muted opacity-40" />
            </div>
          )}
          <div className="p-3">
            <p className="text-white text-sm font-medium truncate">{post.bookTitle}</p>
            <p className="text-tiktok-muted text-xs truncate">{post.niche}</p>
            <p className="text-tiktok-muted text-xs mt-1">{post.slides?.length || 0} Slides</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-tiktok-muted">{new Date(post.createdAt).toLocaleDateString('de-DE')}</span>
              <button
                onClick={() => handleDelete(post.id)}
                className="p-1 rounded text-tiktok-muted hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
        )
      })}
    </div>
  )
}

function ImagesTab() {
  const [images, setImages] = useState([])
  const [paths, setPaths] = useState({})

  useEffect(() => {
    window.api.images.get().then(async (imgs) => {
      setImages(imgs)
      const pathMap = {}
      await Promise.all(
        imgs.map(async img => {
          const p = await window.api.images.getFilePath(img.id)
          if (p) pathMap[img.id] = p
        })
      )
      setPaths(pathMap)
    })
  }, [])

  const handleDelete = async (id) => {
    const updated = await window.api.images.delete(id)
    setImages(updated)
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-tiktok-muted">
        <Image size={40} className="mb-3 opacity-40" />
        <p className="text-sm">Keine Bilder gespeichert.</p>
        <p className="text-xs mt-1">Generiere Bilder im Generator und speichere sie.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map(img => (
        <div
          key={img.id}
          className="bg-tiktok-surface border border-tiktok-border rounded-xl overflow-hidden"
        >
          {paths[img.id] ? (
            <img
              src={'file://' + paths[img.id]}
              alt={img.prompt}
              className="w-full h-40 object-cover"
            />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-tiktok-red/20 to-tiktok-cyan/20 flex items-center justify-center">
              <Image size={28} className="text-tiktok-muted opacity-40" />
            </div>
          )}
          <div className="p-3">
            <p className="text-tiktok-muted text-xs line-clamp-2">{img.prompt}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-tiktok-muted">{img.useCount}x verwendet</span>
              <button
                onClick={() => handleDelete(img.id)}
                className="p-1 rounded text-tiktok-muted hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const TABS = [
  { id: 'hooks', label: 'Hooks', icon: Zap },
  { id: 'posts', label: 'Posts', icon: BookOpen },
  { id: 'images', label: 'Bilder', icon: Image }
]

export default function Library() {
  const [activeTab, setActiveTab] = useState('hooks')

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-tiktok-border shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-tiktok-red text-white'
                  : 'border-transparent text-tiktok-muted hover:text-white'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'hooks' && <HooksTab />}
        {activeTab === 'posts' && <PostsTab />}
        {activeTab === 'images' && <ImagesTab />}
      </div>
    </div>
  )
}
