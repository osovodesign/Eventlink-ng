import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { PageContainer } from '../layout/page-container';
import {
  parseSafeErrorSummary,
  recordOperationalEvent,
} from '../../lib/monitoring/release-monitor';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * ErrorBoundary (Build_Plan.md Phase 1 & Component_Specifications.md Section 4.19)
 * Catches unexpected rendering errors without leaking stack traces, database paths, or secrets.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const safeSummary = parseSafeErrorSummary(error);
    return {
      hasError: true,
      errorMessage:
        safeSummary && safeSummary.length < 180
          ? safeSummary
          : 'An unexpected error occurred while displaying this page. Your account data has not been modified.',
    };
  }

  componentDidCatch(error: Error) {
    recordOperationalEvent('ui_error_boundary', error.name, error.message);
    console.error('[EventLink UI ErrorBoundary]:', error.name);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  handleReturnHome = () => {
    this.setState({ hasError: false, errorMessage: null });
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F6F9] flex items-center py-12">
          <PageContainer>
            <div
              role="alert"
              aria-live="assertive"
              className="mx-auto max-w-lg rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#FEF3F2] text-[#B42318] mb-4">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#142B4A] mb-2">
                Something went wrong
              </h1>
              <p className="text-base text-[#344054] mb-6">
                {this.state.errorMessage}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#142B4A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </button>
                <button
                  type="button"
                  onClick={this.handleReturnHome}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2.5 text-sm font-medium text-[#142B4A] hover:bg-[#F4F6F9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Return to home
                </button>
              </div>
            </div>
          </PageContainer>
        </div>
      );
    }

    return this.props.children;
  }
}
