import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('DreamVerse UI error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass max-w-md p-8 text-center">
          <h1 className="neon-text mb-3 text-2xl">Something glitched in the Verse</h1>
          <p className="mb-6 text-slate-300">
            An unexpected error occurred. Reloading usually fixes it.
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
