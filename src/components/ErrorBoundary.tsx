import { Component, type ReactNode } from "react";

/**
 * Catches any render-time error in the tree below it and shows a calm fallback
 * instead of a blank white screen. This is the last line of defense — the UI
 * should never crash to nothing, even on an unexpected error.
 */
export default class ErrorBoundary extends Component<
  { onReset?: () => void; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { onReset?: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Log for debugging; never surfaces raw errors to the user.
    console.error("UI error caught by boundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#F7F7F5",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              textAlign: "center",
              background: "#fff",
              borderRadius: 20,
              padding: 32,
              boxShadow: "0 20px 50px -24px rgba(28,28,28,.2)",
            }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: "0 0 10px",
                color: "#1C1C1C",
              }}
            >
              Something hiccuped.
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "#6B6B6B",
                lineHeight: 1.5,
                margin: "0 0 22px",
              }}
            >
              Your check is anonymous and nothing you typed was saved anywhere
              it shouldn't be. Let's start fresh.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset?.();
              }}
              style={{
                border: "none",
                background: "#FB5D5D",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                padding: "0 26px",
                height: 48,
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              Start over
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
