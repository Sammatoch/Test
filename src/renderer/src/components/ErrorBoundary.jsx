import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-tiktok-bg p-8">
          <div className="max-w-lg w-full bg-tiktok-surface border border-red-500/40 rounded-xl p-6">
            <h1 className="text-red-400 font-bold text-lg mb-2">Ein Fehler ist aufgetreten</h1>
            <p className="text-tiktok-muted text-sm mb-4">
              Die App ist beim Anzeigen abgestürzt. Details:
            </p>
            <pre className="bg-black border border-tiktok-border rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap overflow-auto max-h-60">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 bg-tiktok-red hover:bg-red-600 text-white text-sm rounded-lg"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
