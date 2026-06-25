import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("App error caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "hsl(var(--background))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "var(--font-body)",
          }}
        >
          <div
            style={{
              maxWidth: 400,
              width: "100%",
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 16,
              padding: "32px 28px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 8,
                color: "hsl(var(--foreground))",
              }}
            >
              Something went wrong
            </div>
            <div
              style={{
                fontSize: 13,
                color: "hsl(var(--muted-foreground))",
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              The app ran into an unexpected error. Please refresh the page. If
              the problem persists contact us at{" "}
              <strong style={{ color: "hsl(20 100% 50%)" }}>
                admin@mk2rivers.co.za
              </strong>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: "hsl(20 100% 50%)",
                color: "#000",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                marginBottom: 10,
              }}
            >
              🔄 Refresh App
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--secondary))",
                color: "hsl(var(--foreground))",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
