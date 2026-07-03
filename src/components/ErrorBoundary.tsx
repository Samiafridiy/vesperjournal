import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode; name?: string };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Keep the rest of the page alive; log for diagnostics.
    console.error(`[ErrorBoundary${this.props.name ? " " + this.props.name : ""}]`, error);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="surface-card-elevated top-accent p-5 md:p-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-neg font-medium mb-2">
            Component unavailable
          </div>
          <div className="text-sm text-soft">
            This card couldn't load. The rest of the page is still working.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}