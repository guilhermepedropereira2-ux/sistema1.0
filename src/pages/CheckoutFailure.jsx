import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XCircle, ArrowLeft, RefreshCw, Scissors, Headphones } from "lucide-react";

export default function CheckoutFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="KingPro" 
            className="h-10 w-10 rounded-full object-cover border border-[#D4AF37]/40 shadow-md shrink-0" 
          />
          <div>
            <h1 className="text-base font-extrabold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500">
              KingPro
            </h1>
            <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider block">
              Mercado Pago Checkout Pro
            </span>
          </div>
        </div>
      </header>

      {/* Card Central */}
      <main className="max-w-md mx-auto w-full py-8 my-auto">
        <div className="p-6 sm:p-8 rounded-[8px] bg-[#0F121C] border border-red-500/30 shadow-2xl text-center space-y-6">
          <div className="space-y-3">
            <div className="h-16 w-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="h-10 w-10" />
            </div>

            <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5">
              Pagamento Não Concluído
            </Badge>

            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
              A transação não foi finalizada
            </h2>

            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              O pagamento foi cancelado ou não autorizado pela operadora. Nenhuma cobrança foi efetuada no seu cartão ou conta.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              onClick={() => navigate("/planos")}
              className="w-full bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-extrabold text-xs uppercase rounded-[4px] h-11 gap-2 shadow-lg cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Tentar Novamente (Outro Método)</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full border-white/20 hover:bg-white/10 text-slate-300 hover:text-white text-xs uppercase rounded-[4px] h-10 gap-1.5 cursor-pointer font-bold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para o Painel</span>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full py-4 border-t border-white/10 text-center text-xs text-slate-500">
        KingPro © {new Date().getFullYear()} • Transações seguras Mercado Pago.
      </footer>
    </div>
  );
}
