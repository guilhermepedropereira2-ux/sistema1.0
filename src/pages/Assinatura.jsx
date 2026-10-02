import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { formatCurrency } from "@/lib/format";
import AsaasPaymentModal from "@/components/AsaasPaymentModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  CreditCard,
  QrCode,
  Building2,
  Users2,
  HelpCircle,
  Scissors,
  ArrowLeft,
  Check,
  Receipt,
  ExternalLink,
} from "lucide-react";

export default function Assinatura() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan: unitPlan, refreshUnits } = useUnit();

  // Ciclo selecionado: "mensal" | "trimestral" | "anual"
  const [billingCycle, setBillingCycle] = useState("mensal");

  // Estado do Modal de Checkout do Asaas
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState({
    planId: "pro",
    planName: "Pro",
    price: 169.9,
    cycle: "mensal",
  });

  // Organização e dados de assinatura atuais
  const org = user?.organization || {};
  const currentPlanId = (unitPlan?.id || org?.plan || "pro").toLowerCase();

  // Identificação do status da assinatura e dias restantes
  const expiresAtStr = user?.subscriptionExpiresAt || org?.subscription_expires_at || null;
  const isTrial = user?.subscriptionStatus === "trial" || org?.subscription_status === "trial";
  const isExpired = user?.subscriptionStatus === "expired" || org?.subscription_status === "expired";

  const { daysRemaining, formattedExpiryDate } = useMemo(() => {
    if (!expiresAtStr) {
      return { daysRemaining: 30, formattedExpiryDate: "30 dias a partir da ativação" };
    }
    const expiryDate = new Date(expiresAtStr);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const formatted = expiryDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return { daysRemaining: diffDays, formattedExpiryDate: formatted };
  }, [expiresAtStr]);

  // Lista dos 3 Planos com valores dinâmicos conforme ciclo selecionado
  const plansData = useMemo(() => {
    return [
      {
        id: "starter",
        key: "starter",
        name: "Starter",
        category: "Solo & Autônomos",
        tagline: "Ideal para barbearias individuais ou profissionais autônomos iniciando.",
        monthlyBase: 79.9,
        highlights: [
          "1 Barbeiro / Cadeira",
          "Atendimentos & Comandas Ilimitadas",
          "Gestão de Fila & Agendamentos",
          "Painel de Faturamento & Caixa Diário",
          "Controle Básico de Comissões",
          "Link de Agendamento Online da Barbearia",
        ],
      },
      {
        id: "pro",
        key: "pro",
        name: "Pró",
        category: "Barbearias em Expansão",
        tagline: "O plano mais completo para barbearias com equipe e foco em crescimento.",
        recommended: true,
        monthlyBase: 169.9,
        highlights: [
          "De 2 a 5 Barbeiros com Acesso Individual",
          "Painel do Barbeiro em Tempo Real",
          "Módulo Balcão Rápido & Venda de Produtos",
          "Motor de Retenção & Recuperação de Clientes",
          "Relatórios Financeiros Avançados & DRE",
          "Comissões Personalizadas por Profissional",
          "Controle de Estoque & Categorias",
        ],
      },
      {
        id: "premium",
        key: "premium",
        name: "Premium",
        category: "Redes & Franquias",
        tagline: "Para barbearias de alto fluxo, redes multiunidades e franquias.",
        monthlyBase: 299.9,
        highlights: [
          "Barbeiros Ilimitados & Multiunidades",
          "Módulo Franquias & Visão Centralizada",
          "Motor Fiscal com Emissão NFC-e",
          "Comparador de Taxas de Maquininhas",
          "Relatórios de Cohort & LTV de Clientes",
          "Acesso Antecipado a Novos Recursos",
          "Suporte Prioritário VIP via WhatsApp",
        ],
      },
    ].map((p) => {
      let monthlyEquivalent = p.monthlyBase;
      let totalBilled = p.monthlyBase;
      let savingsLabel = "";

      if (billingCycle === "trimestral") {
        monthlyEquivalent = Math.round(p.monthlyBase * 0.9 * 10) / 10;
        totalBilled = Math.round(p.monthlyBase * 3 * 0.9 * 10) / 10;
        savingsLabel = "10% de economia";
      } else if (billingCycle === "anual") {
        monthlyEquivalent = Math.round((p.monthlyBase * 10) / 12 * 10) / 10;
        totalBilled = Math.round(p.monthlyBase * 10);
        savingsLabel = "2 Meses Grátis";
      }

      const isCurrent =
        currentPlanId === p.id ||
        (p.id === "starter" && currentPlanId === "basic");

      return {
        ...p,
        isCurrent,
        monthlyEquivalent,
        totalBilled,
        savingsLabel,
      };
    });
  }, [billingCycle, currentPlanId]);

  const handleOpenCheckout = (planItem) => {
    setSelectedCheckout({
      planId: planItem.id,
      planName: planItem.name,
      price: planItem.totalBilled,
      cycle: billingCycle,
    });
    setCheckoutModalOpen(true);
  };

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-6xl mx-auto min-h-screen pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <button
              onClick={() => navigate("/")}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Painel</span>
            </button>
            <span>/</span>
            <span className="text-[#D4AF37] font-semibold">Assinatura & Planos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Gestão de Assinatura</span>
            <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold uppercase tracking-wider px-2 py-0.5">
              Kupola Pay
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Acompanhe o status da sua licença, renove seu plano ou altere seu ciclo com desconto através do checkout seguro Asaas.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
          className="text-xs border-white/10 hover:bg-white/10 text-slate-300 gap-1.5 h-9 rounded-[4px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar ao Sistema</span>
        </Button>
      </div>

      {/* 1. Card de Status Atual do Plano */}
      <div className="relative overflow-hidden rounded-[8px] border border-[#D4AF37]/40 bg-gradient-to-br from-[#121624] via-[#0E111C] to-[#0A0D15] p-6 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-[8px] bg-gradient-to-br from-[#D4AF37] to-[#B38F24] text-[#0A0D14] flex items-center justify-center shrink-0 shadow-lg shadow-[#D4AF37]/20">
              <Crown className="h-7 w-7 stroke-[2.3]" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">
                  Plano Vigente
                </span>
                <span className="text-slate-600">•</span>
                <Badge
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] ${
                    isExpired
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : isTrial
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  <span className="flex h-1.5 w-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                  {isExpired ? "Licença Expirada" : isTrial ? "Período de Teste (7 Dias)" : "Assinatura Ativa"}
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Plano {unitPlan?.name || "Pró"}
              </h2>

              <p className="text-xs text-slate-300 flex items-center gap-2">
                <span>{org?.name || "Sua Barbearia"}</span>
                <span className="text-slate-600">•</span>
                <span>CNPJ/CPF: {org?.document || "Não cadastrado"}</span>
              </p>
            </div>
          </div>

          {/* Métricas de Renovação / Vencimento */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
            <div className="p-3.5 rounded-[6px] bg-black/40 border border-white/[0.08] min-w-[150px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-[#D4AF37]" />
                Tempo Restante
              </span>
              <div className="text-lg font-black text-white mt-1">
                {isExpired ? (
                  <span className="text-red-400">Expirado</span>
                ) : (
                  <span>{daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}</span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                acesso irrestrito
              </span>
            </div>

            <div className="p-3.5 rounded-[6px] bg-black/40 border border-white/[0.08] min-w-[170px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-emerald-400" />
                Data de Renovação
              </span>
              <div className="text-sm font-extrabold text-white mt-1 truncate">
                {formattedExpiryDate}
              </div>
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                renovação automática
              </span>
            </div>

            <Button
              onClick={() => {
                const currentObj = plansData.find((p) => p.isCurrent) || plansData[1];
                handleOpenCheckout(currentObj);
              }}
              className="h-11 px-5 rounded-[4px] bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0A0D14] font-black uppercase text-xs tracking-wider gap-2 shrink-0 shadow-lg shadow-[#D4AF37]/20 active:scale-[0.99] cursor-pointer"
            >
              <Zap className="h-4 w-4 fill-current" />
              <span>Renovar Licença</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Seletor de Ciclos de Pagamento */}
      <div className="text-center space-y-4 pt-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
            Planos & Opções de Faturamento
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Escolha o ciclo ideal para economizar e desbloquear todo o potencial da sua equipe.
          </p>
        </div>

        {/* Toggle de Ciclos (Mensal, Trimestral, Anual) */}
        <div className="inline-flex items-center p-1 rounded-[8px] bg-[#0E111C] border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setBillingCycle("mensal")}
            className={`px-4 py-2 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
              billingCycle === "mensal"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mensal
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle("trimestral")}
            className={`px-4 py-2 rounded-[6px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              billingCycle === "trimestral"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Trimestral</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
              billingCycle === "trimestral" ? "bg-black/20 text-black" : "bg-emerald-500/20 text-emerald-400"
            }`}>
              -10%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle("anual")}
            className={`px-4 py-2 rounded-[6px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              billingCycle === "anual"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Anual</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
              billingCycle === "anual" ? "bg-black text-[#D4AF37]" : "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
            }`}>
              2 Meses Grátis
            </span>
          </button>
        </div>
      </div>

      {/* 3. Cards Comparativos dos Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plansData.map((p) => {
          return (
            <div
              key={p.id}
              className={`relative flex flex-col justify-between p-6 rounded-[8px] border transition-all duration-200 ${
                p.isCurrent
                  ? "bg-[#111422] border-emerald-500/60 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/40"
                  : p.recommended
                  ? "bg-[#131726] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/10 ring-1 ring-[#D4AF37]"
                  : "bg-[#0E111C] border-white/10 hover:border-white/20 hover:bg-[#111422]"
              }`}
            >
              {/* Badges de Destaque Superior */}
              {p.isCurrent && (
                <div className="absolute -top-3 left-4">
                  <span className="bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
                    Plano Atual
                  </span>
                </div>
              )}

              {p.recommended && !p.isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
                    Mais Escolhido
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {p.category}
                  </span>
                  <Crown className={`h-4 w-4 ${p.recommended ? "text-[#D4AF37]" : "text-slate-500"}`} />
                </div>

                <h4 className="font-display text-2xl font-extrabold text-white">
                  {p.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {p.tagline}
                </p>

                {/* Preço recalculado conforme o ciclo */}
                <div className="my-5 p-3.5 rounded-[6px] bg-black/40 border border-white/10 space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-slate-400">R$</span>
                    <span className="text-3xl font-black text-white tracking-tight">
                      {p.monthlyEquivalent.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/mês</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                    <span className="text-slate-400">
                      {billingCycle === "mensal"
                        ? "Cobrado mensalmente"
                        : billingCycle === "trimestral"
                        ? `Total de ${formatCurrency(p.totalBilled)} / trimestre`
                        : `Total de ${formatCurrency(p.totalBilled)} / ano`}
                    </span>
                    {p.savingsLabel && (
                      <span className="text-emerald-400 font-bold">{p.savingsLabel}</span>
                    )}
                  </div>
                </div>

                {/* Lista de Recursos */}
                <div className="space-y-2.5 border-t border-white/10 pt-4 mb-6">
                  {p.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <Check className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <Button
                  onClick={() => handleOpenCheckout(p)}
                  className={`w-full h-11 text-xs font-black uppercase tracking-wider rounded-[4px] gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99] ${
                    p.isCurrent
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/40"
                      : p.recommended
                      ? "bg-[#D4AF37] hover:bg-[#C59F2E] text-black shadow-[#D4AF37]/20"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                  data-testid={`btn-select-plan-${p.id}`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>
                    {p.isCurrent ? "Renovar Este Plano" : `Assinar Plano ${p.name}`}
                  </span>
                </Button>

                <p className="text-[10px] text-center text-slate-400">
                  Fatura Asaas • Pix, Cartão em até 12x ou Boleto
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Modal de Checkout Oficial Asaas */}
      <AsaasPaymentModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        planId={selectedCheckout.planId}
        planName={selectedCheckout.planName}
        price={selectedCheckout.price}
        cycle={selectedCheckout.cycle}
        email={user?.email}
        organizationId={user?.barbershop_id}
        onSuccess={() => {
          if (refreshUnits) refreshUnits();
        }}
      />

      {/* 5. Seção de Confiança, Segurança e Dúvidas */}
      <div className="p-6 rounded-[8px] bg-[#0E111C] border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-[6px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Gateway Homologado Asaas
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Processamento seguro com criptografia bancária e registro direto de cobrança no Banco Central.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-[6px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Ativação Instantânea 100% Automática
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Sem espera de aprovação manual: confirmou o pagamento, seu acesso e equipe são liberados no mesmo segundo.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-[6px] bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Sem Fidelidade Forçada
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Você pode alterar o plano, fazer upgrade ou gerenciar seu ciclo de faturamento quando desejar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
