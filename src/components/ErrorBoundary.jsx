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
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface text-white px-6 text-center">
          <span className="material-symbols-outlined text-intense-red" style={{ fontSize: '4rem' }}>error</span>
          <h1 className="mt-4 font-headline-lg text-2xl font-black">Algo fue mal</h1>
          <p className="mt-2 text-on-surface-variant text-sm">Recarga la página para volver al juego.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-electric-purple text-white rounded-xl font-label-caps text-sm font-bold active:scale-95 transition-all"
          >
            RECARGAR
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
