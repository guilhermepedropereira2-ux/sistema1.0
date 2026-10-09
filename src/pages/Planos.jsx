import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUnit } from "@/context/UnitContext";
import { useAuth } from "@/context/AuthContext";
import { PLANS, getPlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  CheckCircle2,
  Crown,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users2,
  ArrowLeft,
  Calendar,
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    subscription,
    plan: currentPlan,
    changePlan,
    units,
    refreshUnits,
    isSubscriptionExpired,
  } = useUnit();

  const [switching, setSwitching] = useState(false);

  const planId = (subscription?.plan_id || "pro").toLowerCase();
  const activeBarbersCount = subscription?.current_barbers ?? 0;
  const currentUnitsCount = units?.length || 1;

  const renewalDateFormatted = (() => {
    const d = subscription?.subscriptionExpiresAt || subscription?.trial_ends_at || user?.subscriptionExpiresAt;
    if (!d) return "Em 7 dias";
    try {
      return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "Em 7 dias";
    }
  })();

  const isTrial = subscription?.status === "trialing" || subscription?.subscription_status === "trial" || subscription?.subscriptionStatus === "trialing";

  const handleSelectPlan = async (targetKey) => {
    if (targetKey === planId) {
      toast.info(`Você já está utilizando o Plano ${PLANS[targetKey]?.name || targetKey}.`);
      return;
    }

    setSwitching(true);
    try {
      await changePlan(targetKey);
      await refreshUnits?.();
      toast.success(`Plano alterado para ${PLANS[targetKey]?.name} com sucesso!`);
    } catch {
      toast.error("Não foi possível alterar o plano. Tente novamente.");
    } finally {
      setSwitching(false);
    }
  };

  const plansArray = [
    { key: "starter", ...PLANS.starter },
    { key: "pro", ...PLANS.pro },
    { key: "premium", ...PLANS.premium },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 antialiased" data-testid="planos-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#E5C365] border border-[#D4AF37]/30">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Planos e Assinatura
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Gerencie sua assinatura, limites operacionais e recursos da sua barbearia.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="text-xs text-slate-300 border-white/10 hover:bg-white/5 rounded-lg gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Início</span>
          </Button>
        </div>
      </div>

      {/* Card da Assinatura Atual */}
      <Card className="p-5 sm:p-6 bg-[#0D121B] border border-[#D4AF37]/40 rounded-2xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Seu Plano Atual:
              </span>
              <span className="text-lg sm:text-xl font-black text-[#E5C365] uppercase">
                {currentPlan?.name}
              </span>
              <Badge
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  isSubscriptionExpired
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : isTrial
                    ? "bg-[#D4AF37]/20 text-[#E5C365] border-[#D4AF37]/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {isSubscriptionExpired ? "Assinatura Expirada" : isTrial ? "Teste Grátis Ativo (7 dias)" : "Assinatura Ativa"}
              </Badge>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {currentPlan?.tagline}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#080B10] border border-white/10 text-center">
            <div className="p-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Barbeiros Ativos
              </span>
              <span className="text-sm sm:text-base font-black text-white mt-0.5 block font-mono">
                {activeBarbersCount} de {currentPlan?.max_barbers}
              </span>
            </div>

            <div className="p-2 border-l border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Unidades
              </span>
              <span className="text-sm sm:text-base font-black text-white mt-0.5 block font-mono">
                {currentPlan?.multi_unit ? `${currentUnitsCount} (Rede)` : "1 Unidade"}
              </span>
            </div>

            <div className="p-2 border-l border-white/10 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Renovação
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#E5C365] mt-0.5 block">
                {renewalDateFormatted}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid com a Matriz Oficial de 3 Planos */}
      <div>
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-white">
            Escolha ou Altere o seu Plano
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sem fidelidade ou multa rescisória. Alterne de plano conforme o crescimento da sua equipe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {plansArray.map((p) => {
            const isCurrent = planId === p.key || (p.key === "starter" && planId === "basic");

            return (
              <div
                key={p.key}
                className={`relative p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? "bg-[#0F1523] border-[#E5C365] shadow-[0_0_25px_rgba(229,195,101,0.18)] ring-1 ring-[#E5C365]/40"
                    : p.key === "pro"
                    ? "bg-[#0D121B] border-[#D4AF37]/30 hover:border-[#D4AF37]/60"
                    : "bg-[#0B0E14] border-white/10 hover:border-white/20"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9.5px] font-black tracking-widest uppercase bg-gradient-to-r from-[#F3CE72] to-[#D4AF37] text-black px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    {p.badge}
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1 mt-1">
                    <span className="font-extrabold text-base sm:text-lg text-white tracking-wider">
                      {p.name}
                    </span>
                    {isCurrent && (
                      <Badge className="bg-[#E5C365]/20 text-[#E5C365] border-[#E5C365]/40 text-[10px] font-bold uppercase">
                        Plano Atual
                      </Badge>
                    )}
                  </div>

                  <div className="text-2xl sm:text-3xl font-black text-[#E5C365] my-2">
                    {p.priceText}
                  </div>

                  <p className="text-xs text-slate-400 mb-4 leading-relaxed min-h-[36px]">
                    {p.tagline}
                  </p>

                  <div className="space-y-2 border-t border-white/10 pt-4 mb-6">
                    {p.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs leading-tight">
                        {f.included ? (
                          <CheckCircle2 className="w-4 h-4 text-[#20C997] shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center shrink-0 mt-0.5 text-white/30 text-[9px]">
                            ✕
                          </div>
                        )}
                        <span className={f.included ? "text-slate-200" : "text-slate-500 line-through"}>
                          {f.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <Button
                    type="button"
                    disabled={switching || isCurrent}
                    onClick={() => handleSelectPlan(p.key)}
                    className={`w-full h-11 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-white/10 text-white/50 border border-white/10 cursor-default"
                        : p.key === "pro"
                        ? "bg-gradient-to-r from-[#F3CE72] via-[#E5C365] to-[#D4AF37] text-black hover:brightness-110 shadow-md shadow-[#D4AF37]/20"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                    }`}
                  >
                    {isCurrent ? "Plano em Uso" : `Selecionar Plano ${p.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dúvidas Frequentes */}
      <Card className="p-5 bg-[#0D121B] border border-white/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-sm font-bold text-white">
            Perguntas Frequentes sobre os Planos
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1">
            <span className="font-bold text-white block">Posso alterar de plano a qualquer momento?</span>
            <p className="text-slate-400">Sim! Você pode fazer upgrade ou downgrade quando desejar, com aplicação imediata dos novos limites.</p>
          </div>
          <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1">
            <span className="font-bold text-white block">Como funciona o período de teste de 7 dias?</span>
            <p className="text-slate-400">Você tem acesso completo aos recursos durante 7 dias sem qualquer cobrança antecipada.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
