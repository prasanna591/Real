"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("Error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
          <h1 className="font-serif text-2xl font-semibold text-slate-900">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-slate-500">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-all duration-150 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
