import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnit } from "@/context/UnitContext";
import { useAuth } from "@/context/AuthContext";
import { PLANS } from "@/lib/plans";
import { redirectToExternalCheckout } from "@/lib/externalCheckout";
import {
  Crown,
  CheckCircle2,
  Sparkles,
  Zap,
  Lock,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
  CreditCard,
  ExternalLink,
} from "lucide-react";

export default function UpgradeModal() {
  const { upgradeModalOpen, closeUpgradeModal, upgradePayload, plan, changePlan, refreshUnits } = useUnit();
  const { user } = useAuth();
  const [upgradingTo, setUpgradingTo] = useState(null);

  const targetPlanKey = upgradePayload?.targetPlan || (plan.id === "starter" ? "pro" : "premium");

  const handleUpgrade = async (planKey) => {
    setUpgradingTo(planKey);
    try {
      await changePlan(planKey);
      toast.success(`Plano atualizado para ${PLANS[planKey]?.name || planKey}!`, {
        description: "Seu acesso e limites foram atualizados instantaneamente.",
      });
      closeUpgradeModal();
    } catch {
      toast.error("Não foi possível atualizar o plano no momento.");
    } finally {
      setUpgradingTo(null);
    }
  };

  // Os 3 planos oficiais sincronizados com a Landing Page
  const plansList = [
    { key: "starter", ...PLANS.starter },
    { key: "pro", ...PLANS.pro },
    { key: "premium", ...PLANS.premium },
  ];

  return (
    <Dialog open={upgradeModalOpen} onOpenChange={(open) => !open && closeUpgradeModal()}>
      <DialogContent 
        className="w-[95vw] sm:max-w-4xl max-h-[92vh] flex flex-col bg-[#0F121C] border border-[#D4AF37]/50 p-0 text-white shadow-2xl rounded-[6px] overflow-hidden [&>button:last-child]:hidden"
      >
        {/* Header com Tom Dourado e Botão de Fechar Único (sem duplicação de X) */}
        <div className="relative p-5 sm:p-6 bg-[#0A0D14] border-b border-[#D4AF37]/30 shrink-0">
          <button
            type="button"
            onClick={closeUpgradeModal}
            className="absolute top-4 right-4 z-30 h-8 w-8 rounded-[4px] bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar modal"
            data-testid="upgrade-modal-close-btn"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[3px] bg-[#D4AF37] flex items-center justify-center text-[#0B0F19] shrink-0 shadow">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 text-[10px] uppercase font-extrabold tracking-wider rounded-[2px]">
                  Assinatura & Planos
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Plano atual: <b className="text-slate-200">{plan.name}</b>
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-display font-extrabold text-white mt-1">
                {upgradePayload?.title || "Planos & Assinatura da Barbearia"}
              </DialogTitle>
            </div>
          </div>

          <DialogDescription className="text-slate-300 text-xs sm:text-sm mt-2.5 leading-relaxed pr-6">
            {upgradePayload?.message ||
              "Comece com 7 dias de acesso liberado. Escolha o plano ideal para a sua barbearia com ativação instantânea e sem burocracia."}
          </DialogDescription>
        </div>

        {/* Grid de 3 Planos Oficiais da Landing Page */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {plansList.map((p) => {
              const isCurrent = plan.id === p.key || (p.key === "starter" && plan.id === "basic");
              const isRecommended = p.key === "pro";
              const isTarget = targetPlanKey === p.key;

              return (
                <div
                  key={p.key}
                  className={`relative rounded-[6px] p-5 border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "bg-[#0A0D14] border-white/20 opacity-95"
                      : isRecommended || isTarget
                      ? "bg-[#121828] border-[#D4AF37]/70 shadow-xl shadow-[#D4AF37]/5 ring-1 ring-[#D4AF37]/40"
                      : "bg-[#0E131F] border-white/10 hover:border-white/25"
                  }`}
                >
                  {/* Badge de Destaque */}
                  {isRecommended && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-gradient-to-r from-[#E6CA65] to-[#D4AF37] text-[#0B0F17] text-[10px] font-bold uppercase px-3 py-0.5 rounded-full shadow-sm">
                        Mais Escolhido
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="mb-3">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {p.category}
                      </span>
                      <h4 className="font-display text-lg font-bold text-white mt-0.5">{p.name}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-snug">{p.tagline}</p>
                    </div>

                    {/* Badge de Valores sob consulta com condições especiais */}
                    <div className={`py-2 px-3 rounded-md mb-4 border ${
                      isRecommended 
                        ? "bg-[#D4AF37]/10 border-[#D4AF37]/25" 
                        : "bg-white/[0.03] border-white/[0.06]"
                    }`}>
                      <span className={`text-xs font-bold block ${isRecommended ? "text-[#E6CA65]" : "text-slate-200"}`}>
                        {p.priceText || "Valores sob consulta"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.pricingSub || "Condições especiais no lançamento"}
                      </span>
                    </div>

                    {/* Lista de Recursos Oficiais da Landing Page */}
                    <ul className="space-y-2 text-xs text-slate-300 border-t border-white/10 pt-3">
                      {(p.highlights || []).map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                    {/* Ações */}
                  <div className="mt-5 pt-3 border-t border-white/10 space-y-2">
                    {isCurrent ? (
                      <Button
                        disabled
                        className="w-full text-xs h-9 bg-slate-800 text-slate-300 rounded-[4px] border border-white/10"
                      >
                        Seu Plano Atual
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            redirectToExternalCheckout({
                              planId: p.key,
                              planName: p.name,
                              price: p.amount || 169.9,
                              email: user?.email,
                              organizationId: user?.barbershop_id || "org_vintage",
                            });
                          }}
                          className="w-full text-xs h-10 font-black rounded-[4px] shadow-md cursor-pointer transition-all gap-1.5 bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14]"
                          data-testid={`btn-upgrade-checkout-pro-${p.key}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Assinar Plano (Checkout Seguro)</span>
                        </Button>

                        <Button
                          onClick={() => handleUpgrade(p.key)}
                          disabled={upgradingTo !== null}
                          variant="ghost"
                          className="w-full text-xs h-8 text-slate-300 hover:text-white hover:bg-white/10 rounded-[4px] cursor-pointer gap-1"
                        >
                          {upgradingTo === p.key ? (
                            "Ativando..."
                          ) : (
                            <>
                              <span>Ativar Teste de 7 Dias</span>
                              <ArrowRight className="h-3 w-3" />
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    <p className="text-[10px] text-center text-slate-400">
                      R$ {p.amount?.toFixed(2).replace(".", ",")}/mês • Portal Oficial Kupola
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé com Selo de Segurança e Botão Fechar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37] shrink-0" />
              <span>Ambiente de pagamento seguro com ativação instantânea no painel</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={closeUpgradeModal}
              className="w-full sm:w-auto text-xs border-white/20 hover:bg-white/10 text-slate-200 hover:text-white rounded-[4px] h-9 px-4 gap-1.5 cursor-pointer font-semibold"
              data-testid="upgrade-modal-back-btn"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar / Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
