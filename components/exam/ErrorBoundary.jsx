// components/exam/ErrorBoundary.jsx
'use client';

import { Component } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });

    // Optional: Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      // captureError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      const fallback = this.props.fallback || (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-[400px] flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icons.AlertTriangle size={40} className="text-red-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>

            <p className="text-gray-600 mb-6">
              {this.props.message ||
                'We encountered an unexpected error. Please try again.'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Error Details:
                </p>
                <pre className="text-xs text-red-600 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <>
                    <p className="text-sm font-medium text-gray-700 mt-3 mb-2">
                      Component Stack:
                    </p>
                    <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Icons.RefreshCw size={16} />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Icons.RotateCw size={16} />
                Reload Page
              </button>
            </div>

            {this.props.showHomeButton && (
              <button
                onClick={() => (window.location.href = '/')}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700"
              >
                Return to Home
              </button>
            )}
          </div>
        </motion.div>
      );

      return fallback;
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary(WrappedComponent, boundaryProps = {}) {
  return function WithErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Custom hook for functional components (alternative approach)
export function useErrorBoundary() {
  const throwError = (error) => {
    // This will be caught by the nearest ErrorBoundary
    throw error;
  };

  return { throwError };
}

export default ErrorBoundary;
