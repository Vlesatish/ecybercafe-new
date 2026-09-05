import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class PassportErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected rendering error occurred.' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PassportPhoto ErrorBoundary]:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="passport-error-fallback" className="p-8 flex flex-col items-center justify-center text-center bg-red-50/70 border border-red-200 rounded-2xl m-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-red-950 mb-1">Passport Studio Error Encountered</h3>
          <p className="text-sm text-red-700 max-w-md mb-6">
            {this.state.errorMessage || 'Something unexpected happened during photo processing.'}
          </p>
          <button
            id="passport-error-retry-btn"
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
