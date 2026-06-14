import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  reportError?: (error: Error | string, context?: { 
    type?: 'api' | 'js' | 'network' | 'component' | 'validation' | 'unknown';
    component?: string;
    action?: string;
  }) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Report the error
    if (this.props.reportError) {
      this.props.reportError(error, {
        type: 'component',
        component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown'
      });
    }

    // Log to console for debugging
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <h1 className="text-xl font-bold text-foreground mb-2">
              কিছু একটা ভুল হয়েছে
            </h1>
            <p className="text-muted-foreground mb-6">
              দুঃখিত, একটি unexpected error ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন বা পেজ রিলোড করুন।
            </p>

            <div className="space-y-3">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                আবার চেষ্টা করুন
              </Button>
              <Button variant="outline" onClick={this.handleReload} className="w-full">
                পেজ রিলোড করুন
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  Technical Details (Dev Only)
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper to use with hooks
export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  // This will be connected in App.tsx with the actual reportError function
  return <GlobalErrorBoundary>{children}</GlobalErrorBoundary>;
}
