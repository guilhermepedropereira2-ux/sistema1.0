import { Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnit } from "@/context/UnitContext";
import { PLANS } from "@/lib/plans";

export default function LockedFeatureCard({
  title,
  description,
  requiredPlan = "pro",
  featureKey = "fees",
  benefits = [],
}) {
  const { openUpgradeModal, plan } = useUnit();
  const reqPlan = PLANS[requiredPlan] || PLANS.pro;

  const handleUpgradeClick = () => {
    openUpgradeModal({
      title: `Desbloqueie ${title}`,
      message: `Este recurso está disponível a partir do ${reqPlan.name}. Faça o upgrade agora para usufruir de todas as vantagens operacionais e financeiras.`,
      targetPlan: requiredPlan,
      feature: featureKey,
    });
  };

  return (
    <div className="relative overflow-hidden rounded-[4px] border border-[#D4AF37]/30 bg-[#12141F] p-6 sm:p-10 shadow-none text-center max-w-2xl mx-auto my-6">
      {/* Ícone de Cadeado de Luxo */}
      <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[2px] bg-[#181610] border border-[#D4AF37]/40 shadow-none">
        <Lock className="h-6 w-6 text-[#D4AF37]" />
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-[2px] bg-[#D4AF37] text-[#0B0F19]">
          <Crown className="h-2.5 w-2.5 stroke-[3]" />
        </span>
      </div>

      {/* Badge de Requisito */}
      <div className="inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-1 bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-3">
        <Crown className="h-3.5 w-3.5" />
        <span>Disponível no {reqPlan.name}</span>
      </div>

      <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
        {title || "Módulo Bloqueado no seu Plano"}
      </h3>

      <p className="mt-2 text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
        {description ||
          `O seu plano atual (${plan.name}) não possui acesso a esta funcionalidade. Faça o upgrade para o ${reqPlan.name} para desbloquear.`}
      </p>

      {benefits && benefits.length > 0 && (
        <div className="mt-6 rounded-[3px] bg-[#0A0D14] border border-white/10 p-4 max-w-md mx-auto text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] mb-2.5">
            Vantagens do {reqPlan.name}:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botão de Ação para Upgrade */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          onClick={handleUpgradeClick}
          className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0D14] font-bold text-xs uppercase tracking-wider h-10 px-6 rounded-[4px] shadow-none cursor-pointer transition-colors gap-2"
        >
          <span>Fazer Upgrade para o {reqPlan.name}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
