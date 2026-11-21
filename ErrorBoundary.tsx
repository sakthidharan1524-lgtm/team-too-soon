import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('EvidenceOS ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let parsedMsg = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.operationType && parsed.error) {
          parsedMsg = `Firestore ${parsed.operationType} error on ${parsed.path || 'workspace'}: ${parsed.error}`;
        }
      } catch {
        // Plain error message
      }

      return (
        <div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#DCE7DF] rounded-xl p-6">
            <div className="flex items-center gap-3 text-[#DC4545] mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-base font-semibold text-[#17231E]">Workspace Recovery Required</h2>
            </div>
            <p className="text-sm text-[#64746B] leading-relaxed mb-4">{parsedMsg}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#176B45] hover:bg-[#104B32] rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload EvidenceOS
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
