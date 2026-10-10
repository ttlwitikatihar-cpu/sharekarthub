import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/** Branded error page — catches render/runtime crashes and offers a retry. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive shadow-sm">
          <AlertTriangle className="h-9 w-9" aria-hidden />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The page hit an unexpected error and couldn't finish loading. A refresh usually fixes it.
          </p>
          {this.state.message && (
            <p className="text-xs text-muted-foreground/80 break-words line-clamp-3">{this.state.message}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go to homepage
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
