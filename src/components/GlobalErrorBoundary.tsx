import { Component, ErrorInfo, ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { env } from "@/lib/env";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">
            <FormattedMessage id="globalError.title" defaultMessage="Something went wrong" />
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            <FormattedMessage
              id="globalError.description"
              defaultMessage="An unexpected error occurred. Please reload the page or contact support if the problem persists."
            />
          </p>
          {env.devModeEnabled && (
            <p className="font-mono text-xs text-destructive">{this.state.error.message}</p>
          )}
          <button
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            <FormattedMessage id="globalError.reloadButton" defaultMessage="Reload page" />
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
