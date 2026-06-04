import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff } from 'lucide-react'

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
    defaultBookTitle: 'Mein Sauerteig Backbuch',
    defaultNiche: 'Backen / Sauerteig',
    defaultLanguage: 'de',
    defaultProvider: 'anthropic'
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.settings.get().then(s => {
      if (s) setForm(f => ({ ...f, ...s }))
    })
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

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
