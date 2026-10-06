import React from "react";
import { SlidersHorizontal, Calendar } from "lucide-react";

export default function PeriodFilterBar({
  selectedPeriod,
  onPeriodChange,
  onOpenAdvancedFilters,
  selectedMonth,
  showCustomInputs = false,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onApplyCustomDates,
}) {
  const periods = [
    { id: "hoje", label: "Hoje" },
    { id: "7dias", label: "7 Dias" },
    { id: "mes", label: "Este Mês" },
    { id: "3meses", label: "3 Meses" },
    { id: "personalizado", label: "Personalizado" },
  ];

  return (
    <div className="w-full max-w-full space-y-2 pt-0.5 pb-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Container dos botões com rolagem isolada no mobile */}
        <div className="w-full sm:w-auto max-w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 p-1 bg-[#0A0E15] border border-[#161e2c] rounded-xl shadow-inner">
          {periods.map((p) => {
            const isActive = selectedPeriod === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPeriodChange(p.id)}
                className={`shrink-0 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#E5C365] text-slate-950 font-bold shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Indicador sutil de mês de referência no mobile */}
        {selectedMonth && (
          <div className="sm:hidden flex items-center justify-between px-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-1 text-[#E5C365] font-medium">
              <Calendar className="w-3 h-3" />
              <span>{selectedMonth}</span>
            </div>
            {onOpenAdvancedFilters && (
              <button
                type="button"
                onClick={onOpenAdvancedFilters}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Filtros avançados
              </button>
            )}
          </div>
        )}

        {/* Botão de Ferramentas / Filtros no Desktop */}
        {onOpenAdvancedFilters && (
          <button
            type="button"
            onClick={onOpenAdvancedFilters}
            className="hidden sm:flex items-center justify-center p-2 bg-[#0A0E15] border border-[#161e2c] hover:border-[#D4AF37]/50 rounded-xl text-slate-400 hover:text-[#E5C365] transition-all shadow-inner shrink-0 cursor-pointer"
            title="Filtros avançados e comparação"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Seletor de datas personalizadas quando selecionado */}
      {selectedPeriod === "personalizado" && showCustomInputs && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-[#0D121B] rounded-xl border border-[#D4AF37]/30 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">De:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStartChange?.(e.target.value)}
              className="bg-[#0A0E15] border border-[#161e2c] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Até:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEndChange?.(e.target.value)}
              className="bg-[#0A0E15] border border-[#161e2c] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <button
            type="button"
            onClick={onApplyCustomDates}
            className="px-3 py-1 bg-[#D4AF37] hover:bg-[#E5C365] text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
