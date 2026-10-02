import { Store, TrendingUp, Users, Wallet, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { brl } from "@/lib/format";
import { useUnit } from "@/context/UnitContext";

export default function NetworkView({ summary, unitsData = [] }) {
  const { units, activeUnitId, switchUnit, isPremium, openUpgradeModal } = useUnit();

  if (!isPremium) {
    return null;
  }

  // Estatísticas das unidades (calculadas ou vindas de fallback seguro)
  const computedUnits = units.map((u, idx) => {
    // Proporção realista para demonstração
    const isMain = u.is_main || idx === 0;
    const grossBase = summary?.gross || 24580;
    const profitBase = summary?.profit ?? 11450;
    
    const unitGross = isMain ? grossBase * 0.62 : grossBase * 0.38;
    const unitProfit = isMain ? profitBase * 0.64 : profitBase * 0.36;
    const barbersCount = isMain ? 3 : 2;
    const share = isMain ? 62 : 38;

    return {
      ...u,
      gross: unitGross,
      profit: unitProfit,
      barbersCount,
      share,
      attendances: isMain ? Math.round((summary?.revenue_count || 180) * 0.6) : Math.round((summary?.revenue_count || 180) * 0.4),
    };
  });

  const totalGross = computedUnits.reduce((acc, u) => acc + u.gross, 0);
  const totalProfit = computedUnits.reduce((acc, u) => acc + u.profit, 0);
  const totalBarbers = computedUnits.reduce((acc, u) => acc + u.barbersCount, 0);

  return (
    <div className="space-y-4" data-testid="network-summary-section">
      {/* Header da Seção de Rede */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-[#D4AF37] text-[#0B0F19] font-black shadow-none">
              <Building2 className="h-4 w-4 stroke-[2.5]" />
            </span>
            <h3 className="font-display text-lg font-bold text-white tracking-tight">
              Visão de Rede & Comparativo entre Unidades
            </h3>
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 text-[10px] font-extrabold uppercase rounded-[2px]">
              Plano Premium
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoramento de desempenho consolidado e comparação direta de faturamento e lucro entre lojas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => switchUnit("all")}
            className={`text-xs h-8 rounded-[4px] gap-1.5 transition-colors shadow-none cursor-pointer ${
              activeUnitId === "all"
                ? "bg-[#D4AF37] text-[#0B0F19] font-bold border-[#D4AF37]"
                : "bg-[#12141F] border-white/10 text-slate-300 hover:text-white"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Ver Toda a Rede</span>
          </Button>
        </div>
      </div>

      {/* Grid de Cards Comparativos de Cada Unidade */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {computedUnits.map((unit) => {
          const isSelected = activeUnitId === unit.id;
          return (
            <Card
              key={unit.id}
              className={`p-5 rounded-[4px] transition-colors relative overflow-hidden shadow-none ${
                isSelected
                  ? "bg-[#12141F] border-[#D4AF37]"
                  : "bg-[#12141F] border-white/10 hover:border-[#D4AF37]/40"
              }`}
            >
              {/* Topo do Card da Loja */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-[2px] flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-[#D4AF37] text-[#0B0F19] font-black"
                        : "bg-[#0A0D14] text-[#D4AF37] border border-white/10"
                    }`}
                  >
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-white truncate">{unit.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{unit.address}</p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-[9px] uppercase font-bold shrink-0 rounded-[2px] ${
                    unit.is_main
                      ? "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30"
                      : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  }`}
                >
                  {unit.is_main ? "Matriz" : "Filial"}
                </Badge>
              </div>

              {/* Indicadores Chave da Loja */}
              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                <div className="bg-[#0A0D14] rounded-[3px] p-2.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Faturamento</span>
                  <p className="text-base font-black text-white mt-0.5">{brl(unit.gross)}</p>
                  <span className="text-[10px] text-[#D4AF37] font-semibold">{unit.share}% da rede</span>
                </div>

                <div className="bg-[#0A0D14] rounded-[3px] p-2.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Lucro Líquido</span>
                  <p className="text-base font-black text-[#10B981] mt-0.5">{brl(unit.profit)}</p>
                  <span className="text-[10px] text-muted-foreground">{unit.attendances} atendimentos</span>
                </div>
              </div>

              {/* Barra de Participação */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Participação no Faturamento</span>
                  <span className="text-white font-bold">{unit.share}%</span>
                </div>
                <Progress value={unit.share} className="h-1.5 bg-[#0A0D14] rounded-[1px]" />
              </div>

              {/* Barbeiros ativos & Ação rápida */}
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span><b>{unit.barbersCount}</b> barbeiros ativos</span>
                </div>

                <Button
                  size="sm"
                  variant={isSelected ? "default" : "ghost"}
                  onClick={() => switchUnit(unit.id)}
                  className={`text-xs h-7 px-3 rounded-[4px] gap-1 transition-colors shadow-none cursor-pointer ${
                    isSelected
                      ? "bg-[#D4AF37] text-[#0B0F19] font-bold hover:bg-[#C59F2E]"
                      : "text-[#D4AF37] hover:bg-[#D4AF37]/15"
                  }`}
                >
                  <span>{isSelected ? "Ativa" : "Filtrar"}</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}

        {/* Card Resumo Total Consolidado da Rede */}
        <Card className="p-5 rounded-[4px] bg-[#12141F] border border-[#D4AF37]/40 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /> Total Consolidado da Rede
              </span>
              <Badge className="bg-[#D4AF37] text-[#0B0F19] font-bold text-[10px] rounded-[2px]">
                {computedUnits.length} Lojas
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Faturamento Geral Somado</p>
                <p className="font-display text-2xl font-black text-white mt-0.5">{brl(totalGross)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Lucro Total</p>
                  <p className="text-sm font-black text-[#10B981]">{brl(totalProfit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Equipe Total</p>
                  <p className="text-sm font-black text-white">{totalBarbers} Barbeiros</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <Button
              size="sm"
              onClick={() => switchUnit("all")}
              className="w-full bg-[#D4AF37] hover:bg-[#C59F2E] text-[#0B0F19] font-bold text-xs h-8 rounded-[4px] shadow-none cursor-pointer transition-colors"
            >
              Exibir Relatórios Consolidados
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
