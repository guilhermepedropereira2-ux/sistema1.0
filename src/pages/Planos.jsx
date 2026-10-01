import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { PLANS } from "@/lib/plans";
import { redirectToExternalCheckout } from "@/lib/externalCheckout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  CheckCircle2,
  Crown,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  Users2,
  ArrowLeft,
  Clock,
  Zap,
  CreditCard,
  QrCode,
  ExternalLink,
} from "lucide-react";

export default function Planos() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { changePlan, plan: currentPlan, refreshUnits } = useUnit();
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [loading, setLoading] = useState(false);

  const isFromRegister = location.state?.fromRegister || false;

  const handleSelectPlan = async (planKey) => {
    setSelectedPlan(planKey);
    setLoading(true);
    try {
      await changePlan(planKey);
      toast.success(`Plano ${PLANS[planKey]?.name || planKey} selecionado com sucesso!`, {
        description: isFromRegister
          ? "Seu período de 7 dias grátis de acesso liberado está ativo. Aproveite todas as funcionalidades!"
          : "Seu plano foi atualizado com sucesso.",
      });
      navigate("/");
    } catch {
      toast.error("Erro ao ativar plano. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const plansList = [
    { key: "starter", ...PLANS.starter },
    { key: "pro", ...PLANS.pro },
    { key: "premium", ...PLANS.premium },
  ];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-5xl mx-auto w-full py-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Kupola" 
              className="h-11 w-11 rounded-full object-cover border border-[#D4AF37]/40 shadow-md shadow-[#D4AF37]/15 shrink-0" 
            />
            <div>
              <h1 className="font-display text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#D4AF37] to-amber-500 tracking-tight">Kupola</h1>
              <p className="text-xs text-slate-400">Automação financeira & gestão para barbearias</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/landing"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Conhecer recursos detalhados →
            </a>
            {!isFromRegister && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-xs text-slate-400 hover:text-white rounded-[4px] gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </Button>
            )}
          </div>
        </div>

        {/* Boas-vindas pós-cadastro ou upgrade */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Comece com 7 dias de acesso liberado
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
            Selecione o plano da sua barbearia
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Ativação instantânea sem cartão de crédito no início. Você poderá alterar ou gerenciar seu plano a qualquer momento no painel.
          </p>
        </div>

        {/* Grid dos 3 Planos Oficiais da Landing Page */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plansList.map((p) => {
            const isSelected = selectedPlan === p.key;
            const isRecommended = p.key === "pro";

            return (
              <div
                key={p.key}
                onClick={() => setSelectedPlan(p.key)}
                className={`relative flex flex-col justify-between p-6 rounded-[6px] border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "bg-[#141826] border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]"
                    : "bg-[#0F121C] border-white/10 hover:border-white/20 hover:bg-[#121522]"
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-[#0B0D14] text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-[3px] shadow">
                    Mais Escolhido
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {p.category}
                    </span>
                    <Crown className={`h-4 w-4 ${isSelected ? "text-[#D4AF37]" : "text-slate-500"}`} />
                  </div>

                  <h3 className="font-display text-xl font-extrabold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.tagline}</p>

                  <div className="my-4 py-2.5 px-3 rounded-md bg-white/[0.03] border border-white/10">
                    <div className="text-base font-extrabold text-white">
                      {p.priceText || "Valores sob consulta"}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {p.pricingSub || "Consulte condições especiais no lançamento"}
                    </p>
                  </div>

                  <div className="space-y-2.5 border-t border-white/10 pt-4 mb-6">
                    {(p.highlights || []).map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      redirectToExternalCheckout({
                        planId: p.key,
                        planName: p.name,
                        price: p.amount || 169.9,
                        email: user?.email,
                        organizationId: user?.barbershop_id || "org_vintage",
                      });
                    }}
                    className="w-full h-11 font-black uppercase text-xs rounded-[4px] gap-2 cursor-pointer bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] shadow-md transition-all active:scale-[0.99]"
                    data-testid={`btn-assinar-checkout-pro-${p.key}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Assinar Plano (Checkout Seguro)</span>
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(p.key);
                    }}
                    disabled={loading}
                    variant="ghost"
                    className="w-full h-8 font-bold uppercase text-xs rounded-[4px] gap-1.5 cursor-pointer text-slate-300 hover:text-white hover:bg-white/10"
                  >
                    {loading && selectedPlan === p.key ? (
                      "Ativando..."
                    ) : (
                      <>
                        <span>Testar Grátis 7 Dias</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-slate-400">
                    Ambiente Seguro • Ativação Automática Imediata
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Garantias e segurança */}
        <div className="mt-12 p-6 rounded-[6px] bg-[#0E111A] border border-white/5 flex flex-col sm:flex-row items-center justify-around gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-[#D4AF37]" />
            <div>
              <p className="text-xs font-bold text-white">7 Dias de Acesso Liberado</p>
              <p className="text-[11px] text-slate-400">Experimente todos os recursos sem cobranças prévias</p>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-white">Dados 100% Seguros</p>
              <p className="text-[11px] text-slate-400">Backups diários e proteção criptografada</p>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-[#D4AF37]" />
            <div>
              <p className="text-xs font-bold text-white">Ativação Imediata</p>
              <p className="text-[11px] text-slate-400">Cadastrou, acessou o painel completo</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 py-4 border-t border-white/5">
        Kupola © {new Date().getFullYear()} - Sistema para Barbearias e Cabeleireiros. Todos os direitos reservados.
      </footer>
    </div>
  );
}
