import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useUnit } from "@/context/UnitContext";
import { PLANS } from "@/lib/plans";
import { toast } from "sonner";
import {
  Crown,
  CheckCircle2,
  LogOut,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  CreditCard,
  QrCode,
  Zap,
  Building2,
  Users,
  Lock,
} from "lucide-react";
import { redirectToExternalCheckout } from "@/lib/externalCheckout";

export default function SubscriptionExpiredModal({ open = true }) {
  const { user, logout } = useAuth();
  const { changePlan, refreshUnits } = useUnit();
  const [selectedPlanKey, setSelectedPlanKey] = useState("pro");
  const [loadingPlan, setLoadingPlan] = useState(null);

  if (!open) return null;

  const plansList = [
    { key: "starter", ...PLANS.starter, displayPrice: "R$ 79,90" },
    { key: "pro", ...PLANS.pro, displayPrice: "R$ 169,90" },
    { key: "premium", ...PLANS.premium, displayPrice: "R$ 249,90" },
  ];

  const selectedPlanObj = plansList.find((p) => p.key === selectedPlanKey) || plansList[1];

  /**
   * Dispara o fluxo direto do Checkout Seguro Oficial
   */
  const handleCheckout = (planItem) => {
    const targetPlan = planItem || selectedPlanObj;
    redirectToExternalCheckout({
      planId: targetPlan.key,
      planName: targetPlan.name,
      price: targetPlan.amount || (targetPlan.key === "starter" ? 79.9 : targetPlan.key === "premium" ? 249.9 : 169.9),
      email: user?.email,
      organizationId: user?.barbershop_id || "org_vintage",
    });
  };

  return (
    <Dialog open={Boolean(open)} onOpenChange={() => {}}>
      <DialogContent 
        className="w-[96vw] sm:max-w-4xl max-h-[94vh] flex flex-col bg-[#0A0D14] border border-[#D4AF37]/40 p-0 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-[8px] overflow-hidden [&>button:last-child]:hidden"
      >
        {/* Top Header Acolhedor e Comercial */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#121724] via-[#141A28] to-[#17130F] border-b border-[#D4AF37]/25 text-left shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-12 w-12 rounded-[6px] bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-sm mt-0.5">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-[#D4AF37]/20 text-[#E6CA65] border-[#D4AF37]/40 text-[10px] uppercase font-bold tracking-wider rounded-[3px]">
                    7 Dias de Teste Concluídos
                  </Badge>
                  <span className="text-xs text-slate-400 font-sans">
                    {user?.name ? `Barbearia de ${user.name}` : "Kupola"}
                  </span>
                </div>
                <DialogTitle className="text-lg sm:text-2xl font-display font-bold text-white mt-1.5 tracking-tight leading-snug">
                  Esperamos que tenha aproveitado seus 7 dias de experiência!
                </DialogTitle>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-xs text-slate-400 hover:text-white hover:bg-white/5 gap-1.5 h-8 px-2.5 rounded-[4px] border border-white/10 shrink-0"
              title="Sair da conta"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>

          <DialogDescription className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed max-w-3xl">
            O seu período de teste gratuito chegou ao fim. Para continuar usando o Kupola, gerenciando seus atendimentos e acompanhando seu faturamento sem interrupções, escolha o plano ideal para a sua barbearia.
          </DialogDescription>

          {/* Destaque Sutil com Benefícios Conquistados e Segurança dos Dados */}
          <div className="mt-4 p-3 sm:p-3.5 rounded-[6px] bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[#D4AF37] shrink-0" />
              <div>
                <p className="font-semibold text-white">
                  Seus dados, atendimentos e relatórios estão 100% salvos e protegidos.
                </p>
                <p className="text-slate-300 text-[11px] sm:text-xs">
                  Clientes, histórico de caixa e comissões da sua equipe continuam intactos. Ao assinar, você continua de onde parou no mesmo segundo.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-[11px] font-medium text-[#E6CA65] bg-black/40 px-2.5 py-1 rounded-[4px] border border-[#D4AF37]/20">
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Liberação imediata via Pix</span>
            </div>
          </div>
        </div>

        {/* Seleção de Planos com Pagamento Seguro */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
              <span>Selecione seu plano para desbloquear o sistema:</span>
            </p>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Ambiente 100% seguro e criptografado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {plansList.map((p) => {
              const isSelected = selectedPlanKey === p.key;
              const isPro = p.key === "pro";
              const isLoading = loadingPlan === p.key;

              return (
                <div
                  key={p.key}
                  onClick={() => setSelectedPlanKey(p.key)}
                  className={`relative flex flex-col justify-between p-5 rounded-[6px] border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#141A28] border-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]"
                      : isPro
                      ? "bg-[#101420] border-[#D4AF37]/40 hover:border-[#D4AF37]/70"
                      : "bg-[#0E111B] border-white/10 hover:border-white/20"
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-gradient-to-r from-[#E6CA65] to-[#D4AF37] text-[#0A0D14] text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm">
                        Mais Escolhido
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {p.category}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#D4AF37] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Selecionado
                          </span>
                        )}
                      </div>
                      <h4 className="font-display text-lg font-bold text-white mt-0.5">{p.name}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-snug">{p.tagline}</p>
                    </div>

                    <div
                      className={`py-2.5 px-3 rounded-md mb-4 border ${
                        isSelected || isPro
                          ? "bg-[#D4AF37]/10 border-[#D4AF37]/30"
                          : "bg-white/[0.03] border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-[#E6CA65]">
                          {p.displayPrice}
                        </span>
                        <span className="text-xs text-slate-400">/mês</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {p.key === "starter"
                          ? "Até 1 barbeiro ou cadeira solo"
                          : p.key === "pro"
                          ? "De 2 a 5 barbeiros com app individual"
                          : "Redes e barbearias com multiunidades"}
                      </span>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-300 border-t border-white/10 pt-3">
                      {(p.highlights || []).map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                          <span className="leading-snug">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/10 space-y-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanKey(p.key);
                        handleCheckout(p);
                      }}
                      disabled={loadingPlan !== null}
                      className={`w-full text-xs font-bold uppercase rounded-[4px] h-10 gap-1.5 shadow-md transition-all active:scale-[0.99] ${
                        isSelected || isPro
                          ? "bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0A0D14]"
                          : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      data-testid={`btn-select-plan-${p.key}`}
                    >
                      {isLoading ? (
                        <>
                          <Zap className="h-4 w-4 animate-spin" />
                          <span>Conectando ao checkout seguro...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 fill-current" />
                          <span>Escolher Plano e Continuar</span>
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                      <span>Pix</span>
                      <span>•</span>
                      <span>Cartão de Crédito</span>
                      <span>•</span>
                      <span>Boleto</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de Ação Evidente e Centralizada */}
          <div className="p-4 rounded-[6px] bg-[#121622] border border-[#D4AF37]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#D4AF37]/20 text-[#E6CA65] border-none text-[10px] uppercase font-bold">
                  Plano Selecionado
                </Badge>
                <span className="text-sm font-bold text-white">
                  {selectedPlanObj.name} — {selectedPlanObj.displayPrice}/mês
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Clique no botão ao lado para abrir o pagamento seguro oficial com ativação automática instantânea.
              </p>
            </div>

            <Button
              onClick={() => handleCheckout(selectedPlanObj)}
              disabled={loadingPlan !== null}
              size="lg"
              className="w-full sm:w-auto h-12 px-6 rounded-[4px] bg-gradient-to-r from-[#E6CA65] to-[#D4AF37] hover:from-[#DFBE58] hover:to-[#C59F2E] text-[#0A0D14] font-black uppercase tracking-wider text-xs sm:text-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] gap-2 shrink-0 active:scale-[0.99] cursor-pointer"
              data-testid="btn-main-choose-plan-continue"
            >
              <span>Escolher Plano e Assinar</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Rodapé Informativo */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#D4AF37]" />
              <span>Sem fidelidade obrigatória. Você pode cancelar ou alterar seu plano quando desejar.</span>
            </div>
            <a
              href="/landing"
              target="_blank"
              rel="noreferrer"
              className="text-[#D4AF37] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Ver comparativo completo dos recursos</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
