import { Component, type ReactNode } from "react";

// Last line of defence: without this, a single render error blanks the whole app.
// Class component because error boundaries have no hook equivalent.
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled render error:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="hero-screen">
        <div className="hero-card fade-in">
          <h2>Something broke</h2>
          <p className="hint">
            An unexpected error stopped the app from rendering. Your team is saved on the
            server — reloading should get you back to where you were.
          </p>
          <p className="hint error-detail">{this.state.error.message}</p>
          <button className="primary-btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
