import { useState } from "react";
import { Store, ChevronDown, Check, Building2, Layers, Sparkles, Plus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useUnit } from "@/context/UnitContext";

export default function UnitSelector({ variant = "header" }) {
  const {
    units,
    activeUnitId,
    activeUnit,
    switchUnit,
    plan,
    isPremium,
    openUpgradeModal,
  } = useUnit();

  // Se estiver no plano Básico ou Pro (apenas 1 unidade permitida)
  if (!isPremium) {
    if (variant === "compact") return null;

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#12141F] border border-white/10 text-xs text-slate-300">
          <Store className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span className="font-semibold text-white truncate max-w-[150px]">
            {units[0]?.name || "Unidade Matriz"}
          </span>
          <button
            onClick={() =>
              openUpgradeModal({
                title: "Desbloqueie Gestão Multi-Unidades",
                message:
                  "Para gerenciar mais de uma barbearia com seletor de lojas e visão consolidada de faturamento, faça o upgrade para o Plano Premium.",
                targetPlan: "premium",
                feature: "multi_unit",
              })
            }
            className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-md bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] text-[10px] font-bold transition-all border border-[#D4AF37]/30 cursor-pointer"
            title="Adicionar mais unidades (Rede) - Exclusivo Plano Premium"
          >
            <Crown className="h-3 w-3" />
            <span className="hidden sm:inline">+ Rede</span>
          </button>
        </div>
      </div>
    );
  }

  const isConsolidated = activeUnitId === "all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-[#12141F] border border-[#D4AF37]/40 text-white hover:bg-[#181D2E] hover:border-[#D4AF37] text-xs font-semibold h-9 px-3 rounded-[4px] gap-2 transition-colors shadow-none max-w-[240px] cursor-pointer"
          data-testid="unit-selector-trigger"
        >
          {isConsolidated ? (
            <Layers className="h-4 w-4 text-[#D4AF37] shrink-0" />
          ) : (
            <Store className="h-4 w-4 text-[#D4AF37] shrink-0" />
          )}

          <div className="flex flex-col items-start text-left truncate leading-tight">
            <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">
              {isConsolidated ? "Rede Completa" : "Unidade Ativa"}
            </span>
            <span className="font-bold text-white truncate text-xs">
              {isConsolidated ? "Todas as Unidades (Visão Geral)" : activeUnit?.name || "Selecionar Unidade"}
            </span>
          </div>

          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 bg-[#12141F] border border-white/10 text-white p-2 rounded-[4px] shadow-none z-50"
      >
        <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
          <span>Unidades da Barbearia</span>
          <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 text-[9px] font-bold rounded-[2px]">
            Rede Ativa
          </Badge>
        </DropdownMenuLabel>

        <div className="space-y-1 mt-1">
          {units.map((unit) => {
            const isSelected = activeUnitId === unit.id;
            return (
              <DropdownMenuItem
                key={unit.id}
                onClick={() => switchUnit(unit.id)}
                className={`flex items-center justify-between px-3 py-2 text-xs rounded-[3px] cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
                data-testid={`select-unit-${unit.id}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-[2px] flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-[#D4AF37] text-[#0B0F19]" : "bg-[#0A0D14] text-slate-300 border border-white/10"
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{unit.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {unit.city || "São Paulo"} {unit.is_main ? "• Matriz" : "• Filial"}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-[#D4AF37] shrink-0 ml-2" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="bg-white/10 my-2" />

        {/* Opção Visão Geral / Todas as Unidades */}
        <DropdownMenuItem
          onClick={() => switchUnit("all")}
          className={`flex items-center justify-between px-3 py-2 text-xs rounded-[3px] cursor-pointer transition-colors ${
            isConsolidated
              ? "bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
          data-testid="select-unit-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`h-7 w-7 rounded-[2px] flex items-center justify-center shrink-0 ${
                isConsolidated ? "bg-[#D4AF37] text-[#0B0F19]" : "bg-[#0A0D14] text-slate-300 border border-white/10"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold flex items-center gap-1">
                Todas as Unidades (Visão Geral)
                <Sparkles className="h-3 w-3 text-[#D4AF37]" />
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                Faturamento e métricas somadas de toda a rede
              </span>
            </div>
          </div>
          {isConsolidated && <Check className="h-4 w-4 text-[#D4AF37] shrink-0 ml-2" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
