import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors and displays fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // In production, you could report this to an error reporting service
    if (process.env.NEXT_PUBLIC_REPORT_URL) {
      // Send error to monitoring service
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8">
            <div className="text-center mb-6">
              <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="mt-4 text-xl font-bold text-gray-900">Something Went Wrong</h2>
              <p className="mt-2 text-gray-600">
                An error occurred while rendering this component.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm font-mono overflow-x-auto">
              {this.state.error?.message}
            </div>

            <Button
              onClick={() => window.location.reload()}
              variant="primary"
            >
              Reload Page
            </Button>

            <Button
              onClick={() => window.location.href = '/'}
              variant="secondary"
              className="mt-3 w-full"
            >
              Go to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Default Fallback Component (can be customized)
 */
export const ErrorFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8">
      <div className="text-center mb-6">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Something Went Wrong</h2>
        <p className="mt-2 text-gray-600">
          We're sorry, but an error occurred. Please try refreshing the page or contact support if the issue persists.
        </p>
      </div>

      <Button
        onClick={() => window.location.reload()}
        variant="primary"
      >
        Reload Page
      </Button>

      <Button
        onClick={() => window.location.href = '/'}
        variant="secondary"
        className="mt-3 w-full"
      >
        Go to Home
      </Button>
    </div>
  </div>
);

export default ErrorBoundary;
