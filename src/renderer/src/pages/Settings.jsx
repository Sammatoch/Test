import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, FolderOpen } from 'lucide-react'

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

function MaskedInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black border border-tiktok-border rounded-lg px-3 py-2.5 text-white text-sm pr-10 focus:outline-none focus:border-tiktok-red placeholder-tiktok-muted"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-tiktok-muted hover:text-white"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-1">{label}</label>
      {hint && <p className="text-xs text-tiktok-muted mb-2">{hint}</p>}
      {children}
    </div>
  )
}

export default function Settings() {
  const [form, setForm] = useState({
    anthropicKey: '',
    openaiKey: '',
    geminiKey: '',
    apifyKey: '',
    referenceBaseDir: '',
    bookCoverPath: '',
    bookBackCoverPath: '',
    defaultBookTitle: 'Mein Sauerteig Backbuch',
    defaultNiche: 'Backen / Sauerteig',
    defaultLanguage: 'de',
    defaultProvider: 'anthropic'
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [coverPreview, setCoverPreview] = useState(null)
  const [backCoverPreview, setBackCoverPreview] = useState(null)

  useEffect(() => {
    window.api.settings.get().then(s => {
      if (s) setForm(f => ({ ...f, ...s }))
    })
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // Load a preview of the configured book cover
  useEffect(() => {
    if (!form.bookCoverPath) { setCoverPreview(null); return }
    window.api.references.readAsBase64(form.bookCoverPath)
      .then(b64 => setCoverPreview(b64 || null))
      .catch(() => setCoverPreview(null))
  }, [form.bookCoverPath])

  // Load a preview of the configured back cover
  useEffect(() => {
    if (!form.bookBackCoverPath) { setBackCoverPreview(null); return }
    window.api.references.readAsBase64(form.bookBackCoverPath)
      .then(b64 => setBackCoverPreview(b64 || null))
      .catch(() => setBackCoverPreview(null))
  }, [form.bookBackCoverPath])

  const handleSelectFolder = async () => {
    const dir = await window.api.references.selectFolder()
    if (dir) set('referenceBaseDir', dir)
  }

  const handleSelectCover = async () => {
    const file = await window.api.references.selectImageFile()
    if (file) set('bookCoverPath', file)
  }

  const handleSelectBackCover = async () => {
    const file = await window.api.references.selectImageFile()
    if (file) set('bookBackCoverPath', file)
  }

  const handleSave = async () => {
    try {
      setError('')
      await window.api.settings.save(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-6">Einstellungen</h2>

        <div className="space-y-6">
          <div className="bg-tiktok-surface border border-tiktok-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-tiktok-cyan mb-4 uppercase tracking-wider">API-Schlüssel</h3>
            <div className="space-y-4">
              <Field
                label="Anthropic API-Key (Claude)"
                hint="Für Claude-basierte Inhaltsgenerierung. Hole deinen Key auf console.anthropic.com"
              >
                <MaskedInput
                  value={form.anthropicKey}
                  onChange={v => set('anthropicKey', v)}
                  placeholder="sk-ant-..."
                />
              </Field>
              <Field
                label="OpenAI API-Key (GPT-4o + DALL-E 3)"
                hint="Für GPT-4o-Generierung und DALL-E 3 Bilder. Hole deinen Key auf platform.openai.com"
              >
                <MaskedInput
                  value={form.openaiKey}
                  onChange={v => set('openaiKey', v)}
                  placeholder="sk-..."
                />
              </Field>
              <Field
                label="Google Gemini API-Key"
                hint="Für Gemini-basierte Generierung. Hole deinen Key auf aistudio.google.com"
              >
                <MaskedInput
                  value={form.geminiKey}
                  onChange={v => set('geminiKey', v)}
                  placeholder="AIza..."
                />
              </Field>
              <Field
                label="Apify API-Key (Viral Research)"
                hint="Für TikTok Viral Research. Hole deinen Key auf console.apify.com"
              >
                <MaskedInput
                  value={form.apifyKey}
                  onChange={v => set('apifyKey', v)}
                  placeholder="apify_api_..."
                />
              </Field>
            </div>
          </div>

          <div className="bg-tiktok-surface border border-tiktok-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-tiktok-cyan mb-4 uppercase tracking-wider">Referenzbilder</h3>
            <Field
              label="Referenz-Basisordner"
              hint="Ordner auf deiner Festplatte mit Referenzbildern. Im Generator kannst du dann per Combobox einen Unterordner auswählen, dessen Bilder als Stil-Referenz genutzt werden."
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.referenceBaseDir}
                  onChange={e => set('referenceBaseDir', e.target.value)}
                  placeholder="z.B. C:\Users\Du\Referenzen"
                  className="flex-1 bg-black border border-tiktok-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-tiktok-red placeholder-tiktok-muted"
                />
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="flex items-center gap-2 px-4 py-2.5 border border-tiktok-border hover:border-white/30 text-tiktok-muted hover:text-white rounded-lg text-sm transition-colors shrink-0"
                >
                  <FolderOpen size={16} />
                  Wählen
                </button>
              </div>
            </Field>

            <div className="mt-4">
              <Field
                label="Buchcover – Vorderseite (letzte Slide)"
                hint="Dein Buchcover (Vorderseite). Es wird im Generator als Referenz genutzt und natürlich in eine Szene der LETZTEN Slide eingebaut (mit deinem Kauf-Aufruf als Text darüber)."
              >
                <div className="flex gap-2 items-start">
                  {coverPreview ? (
                    <img
                      src={'data:image/png;base64,' + coverPreview}
                      alt="Cover"
                      className="w-12 h-[68px] object-cover rounded-md border border-tiktok-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-[68px] rounded-md border border-dashed border-tiktok-border flex items-center justify-center shrink-0">
                      <FolderOpen size={16} className="text-tiktok-muted opacity-50" />
                    </div>
                  )}
                  <input
                    type="text"
                    value={form.bookCoverPath}
                    onChange={e => set('bookCoverPath', e.target.value)}
                    placeholder="z.B. C:\Users\Du\cover.png"
                    className="flex-1 bg-black border border-tiktok-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-tiktok-red placeholder-tiktok-muted"
                  />
                  <button
                    type="button"
                    onClick={handleSelectCover}
                    className="flex items-center gap-2 px-4 py-2.5 border border-tiktok-border hover:border-white/30 text-tiktok-muted hover:text-white rounded-lg text-sm transition-colors shrink-0"
                  >
                    <FolderOpen size={16} />
                    Wählen
                  </button>
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <Field
                label="Buchcover – Rückseite (optional)"
                hint="Optional: die Rückseite deines Buchs. Wird zusätzlich als Referenz übergeben, damit das Buch in der Szene noch realistischer wirkt."
              >
                <div className="flex gap-2 items-start">
                  {backCoverPreview ? (
                    <img
                      src={'data:image/png;base64,' + backCoverPreview}
                      alt="Backcover"
                      className="w-12 h-[68px] object-cover rounded-md border border-tiktok-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-[68px] rounded-md border border-dashed border-tiktok-border flex items-center justify-center shrink-0">
                      <FolderOpen size={16} className="text-tiktok-muted opacity-50" />
                    </div>
                  )}
                  <input
                    type="text"
                    value={form.bookBackCoverPath}
                    onChange={e => set('bookBackCoverPath', e.target.value)}
                    placeholder="z.B. C:\Users\Du\backcover.png"
                    className="flex-1 bg-black border border-tiktok-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-tiktok-red placeholder-tiktok-muted"
                  />
                  <button
                    type="button"
                    onClick={handleSelectBackCover}
                    className="flex items-center gap-2 px-4 py-2.5 border border-tiktok-border hover:border-white/30 text-tiktok-muted hover:text-white rounded-lg text-sm transition-colors shrink-0"
                  >
                    <FolderOpen size={16} />
                    Wählen
                  </button>
                </div>
              </Field>
            </div>
          </div>

          <div className="bg-tiktok-surface border border-tiktok-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-tiktok-cyan mb-4 uppercase tracking-wider">Standard-Werte</h3>
            <div className="space-y-4">
              <Field label="Standard Buchtitel">
                <input
                  type="text"
                  value={form.defaultBookTitle}
                  onChange={e => set('defaultBookTitle', e.target.value)}
                  className="w-full bg-black border border-tiktok-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-tiktok-red placeholder-tiktok-muted"
                />
              </Field>
              <Field label="Standard Nische">
                <input
                  type="text"
                  value={form.defaultNiche}
                  onChange={e => set('defaultNiche', e.target.value)}
                  className="w-full bg-black border border-tiktok-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-tiktok-red placeholder-tiktok-muted"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Standard Sprache">
                  <select
                    value={form.defaultLanguage}
                    onChange={e => set('defaultLanguage', e.target.value)}
                    className="w-full bg-black border border-tiktok-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-tiktok-red"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Standard Provider">
                  <select
                    value={form.defaultProvider}
                    onChange={e => set('defaultProvider', e.target.value)}
                    className="w-full bg-black border border-tiktok-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-tiktok-red"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-tiktok-red hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={16} />
            {saved ? 'Gespeichert!' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
