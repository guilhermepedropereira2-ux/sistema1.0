import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useUnit } from "@/context/UnitContext";
import { useAuth } from "@/context/AuthContext";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Loader2,
  Scissors,
} from "lucide-react";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUnits, changePlan } = useUnit();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Parâmetros retornados pelo Mercado Pago
  const collectionStatus =
    searchParams.get("collection_status") ||
    searchParams.get("status") ||
    "approved";
  const collectionId =
    searchParams.get("collection_id") ||
    searchParams.get("payment_id") ||
    "";
  const preferenceId = searchParams.get("preference_id") || "";
  const paymentType = searchParams.get("payment_type") || "";
  const planIdQuery = searchParams.get("plan_id") || "pro";
  const orgIdQuery = searchParams.get("org_id") || "org_vintage";

  useEffect(() => {
    let isMounted = true;

    async function confirmPayment() {
      try {
        const response = await fetch("/api/checkout/verify_return", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            collection_status: collectionStatus,
            status: collectionStatus,
            payment_id: collectionId,
            collection_id: collectionId,
            preference_id: preferenceId,
            plan_id: planIdQuery,
            organization_id: orgIdQuery,
          }),
        });

        const data = await response.json();

        if (!isMounted) return;

        if (response.ok && data.success) {
          setResult(data);
          toast.success("Assinatura confirmada com sucesso!", {
            description: "Seu plano e funcionalidades estão 100% liberados.",
          });
          refreshUnits?.();
        } else {
          // Mesmo com aviso de pendência, exibe tela informativa
          setError(data.message || "Pagamento em análise ou pendente.");
        }
      } catch (err) {
        if (!isMounted) return;
        setError("Erro na validação do pagamento. Nossa equipe já foi notificada.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    confirmPayment();

    return () => {
      isMounted = false;
    };
  }, [collectionStatus, collectionId, preferenceId, planIdQuery, orgIdQuery, refreshUnits]);

  const planInfo = PLANS[planIdQuery] || PLANS.pro;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="KortePro" 
            className="h-10 w-10 rounded-full object-cover border border-[#D4AF37]/40 shadow-md shrink-0" 
          />
          <div>
            <h1 className="text-base font-extrabold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500">
              KortePro
            </h1>
            <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider block">
              Mercado Pago Checkout Pro
            </span>
          </div>
        </div>
      </header>

      {/* Card Central */}
      <main className="max-w-xl mx-auto w-full py-8 my-auto">
        <div className="p-6 sm:p-8 rounded-[8px] bg-[#0F121C] border border-[#D4AF37]/50 shadow-2xl text-center space-y-6">
          {loading ? (
            <div className="py-12 space-y-4">
              <Loader2 className="h-12 w-12 text-[#D4AF37] animate-spin mx-auto" />
              <h2 className="text-xl font-bold font-display text-white">
                Validando seu Pagamento...
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Estamos sincronizando seu pagamento aprovado junto ao Mercado Pago para liberar seu acesso imediatamente.
              </p>
            </div>
          ) : error ? (
            <div className="py-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold font-display text-white">
                Pagamento em Processamento
              </h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                {error}
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button
                  onClick={() => navigate("/")}
                  className="bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase rounded-[4px] h-10 px-6 cursor-pointer"
                >
                  Ir para o Painel Principal
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5">
                  Pagamento Aprovado • Mercado Pago
                </Badge>

                <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
                  Assinatura Ativada com Sucesso!
                </h2>

                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Parabéns! Sua organização está com a assinatura{" "}
                  <strong className="text-[#D4AF37]">{planInfo.name}</strong> 100% ativa. Todos os recursos já estão disponíveis.
                </p>
              </div>

              {/* Box de Detalhes da Transação */}
              <div className="p-4 rounded-[6px] bg-[#0A0D14] border border-white/10 text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                  <span className="text-slate-400">Plano Contratado:</span>
                  <span className="font-bold text-white uppercase">{planInfo.name}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                  <span className="text-slate-400">Valor Mensal:</span>
                  <span className="font-bold text-[#D4AF37]">
                    R$ {planInfo.amount?.toFixed(2).replace(".", ",")}/mês
                  </span>
                </div>

                {collectionId && (
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                    <span className="text-slate-400">ID da Transação:</span>
                    <span className="font-mono text-slate-300 text-[11px]">{collectionId}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Status da Conta:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Ativa & Sincronizada
                  </span>
                </div>
              </div>

              {/* Botão de Ação Direta para o Painel Principal */}
              <div className="pt-2">
                <Button
                  onClick={() => {
                    refreshUnits?.();
                    navigate("/");
                  }}
                  className="w-full bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-extrabold text-sm uppercase rounded-[4px] h-12 gap-2 shadow-lg cursor-pointer"
                  data-testid="btn-go-dashboard-after-checkout"
                >
                  <span>Acessar Painel Principal</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-[11px] text-slate-400 mt-2">
                  Você já pode utilizar agendamentos, balcão, controle financeiro e comissões.
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full py-4 border-t border-white/10 text-center text-xs text-slate-500">
        KortePro © {new Date().getFullYear()} • Transações processadas oficialmente via Mercado Pago Checkout Pro.
      </footer>
    </div>
  );
}
