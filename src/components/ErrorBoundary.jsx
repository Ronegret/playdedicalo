import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-white px-6 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,122,26,0.18),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.20),transparent_42%)]" />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-black/35 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <span aria-hidden="true" className="material-symbols-outlined text-vinyl-orange" style={{ fontSize: '4rem' }}>graphic_eq</span>
            <h1 className="mt-4 font-headline-lg text-3xl font-black leading-none">La pista se detuvo</h1>
            <p className="mx-auto mt-3 max-w-xs text-on-surface-variant text-sm leading-relaxed">
              Recarga para volver al juego. Si estabas en una sala, entra otra vez con el mismo PIN.
            </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 min-h-14 w-full rounded-2xl border border-vinyl-orange/45 bg-vinyl-orange/15 px-6 py-3 text-white font-label-caps text-sm font-bold tracking-[0.16em] active:scale-95 transition-all"
          >
            RECARGAR PARTIDA
          </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
