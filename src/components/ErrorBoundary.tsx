/**
 * ErrorBoundary — catches React render errors in any child subtree.
 *
 * Wrapping each page in an ErrorBoundary means a runtime crash in one tab
 * (e.g. unexpected null field from the API) shows a recoverable error state
 * rather than a white screen that takes down the whole app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *     <SomePage />
 *   </ErrorBoundary>
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Custom fallback UI. Defaults to the built-in glass-panel error card. */
  fallback?: React.ReactNode;
  /** Optional label shown in the error card (e.g. "Judgments"). */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in development; swap for Sentry / DataDog in production.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const label = this.props.label ? `"${this.props.label}"` : 'this section';

    return (
      <div
        className="animate-fade-in glass-panel"
        style={{
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '1rem',
            borderRadius: '50%',
            color: 'var(--danger)',
          }}
        >
          <AlertTriangle size={36} />
        </div>

        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Something went wrong in {label}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.5 }}>
            An unexpected error was caught. The rest of the app is unaffected.
            Try refreshing this section or check the browser console for details.
          </p>
        </div>

        {this.state.error && (
          <pre
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              fontSize: '0.72rem',
              color: 'var(--danger)',
              fontFamily: 'var(--font-mono)',
              maxWidth: '100%',
              overflow: 'auto',
              textAlign: 'left',
              maxHeight: '140px',
            }}
          >
            {this.state.error.message}
          </pre>
        )}

        <button
          className="glass-button"
          onClick={this.handleReset}
          style={{ gap: '0.5rem', padding: '0.5rem 1.25rem' }}
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }
}
