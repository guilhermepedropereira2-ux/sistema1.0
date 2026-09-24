import React from "react";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-[60vh] flex items-center justify-center p-6 text-white"
          data-testid="error-boundary-fallback"
        >
          <div className="w-full max-w-lg rounded-[4px] bg-[#12141F] border border-white/10 p-6 sm:p-8 shadow-none text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[2px] bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {this.props.title || "Ops! Ocorreu um problema nesta tela"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                {this.props.description ||
                  "Não foi possível carregar os dados agora. Suas informações continuam salvas e seguras."}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="rounded-[3px] bg-[#0A0D14] border border-white/10 p-3 text-left">
                <p className="text-[11px] font-mono text-muted-foreground break-all line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={this.handleReset}
                className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0D0E12] font-bold text-xs uppercase tracking-wider h-10 px-5 rounded-[4px] shadow-none gap-2"
                data-testid="error-retry-btn"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Tentar Novamente</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="w-full sm:w-auto bg-[#12141F] border-white/10 text-white hover:bg-[#181D2E] text-xs font-semibold h-10 px-5 rounded-[4px] shadow-none gap-2"
                data-testid="error-home-btn"
              >
                <Home className="h-4 w-4 text-muted-foreground" />
                <span>Página Inicial</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
