import React from "react";
import {
  DollarSign,
  Scissors,
  Package,
  Users,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

export default function MetricCards({ metrics = [], onCardClick }) {
  const getIcon = (id) => {
    switch (id) {
      case "faturamento":
        return (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1e1910] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(212,175,55,0.1)] group-hover:border-[#E5C365] transition-colors">
            <DollarSign className="w-4 h-4 text-[#E5C365] stroke-[2.2]" />
          </div>
        );
      case "servicos":
        return (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1e1910] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(212,175,55,0.1)] group-hover:border-[#E5C365] transition-colors">
            <Scissors className="w-4 h-4 text-[#E5C365] stroke-[2.2]" />
          </div>
        );
      case "produtos":
        return (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#241a12] border border-[#d97706]/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(217,119,6,0.1)] group-hover:border-[#f59e0b] transition-colors">
            <Package className="w-4 h-4 text-[#f59e0b] stroke-[2.2]" />
          </div>
        );
      case "atendimentos":
        return (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#241a12] border border-[#d97706]/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(217,119,6,0.1)] group-hover:border-[#f59e0b] transition-colors">
            <Users className="w-4 h-4 text-[#f59e0b] stroke-[2.2]" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4 w-full">
      {metrics.map((card) => (
        <div
          key={card.id}
          onClick={() => onCardClick?.(card.id)}
          className="group relative p-3 sm:p-4 rounded-2xl bg-[#0D121B] border border-[#161e2c] hover:border-[#D4AF37]/40 hover:bg-[#111722] transition-all cursor-pointer shadow-lg hover:shadow-xl flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2">
            <div className="min-w-0 flex-1">
              {/* Título da métrica - Nunca truncado */}
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 tracking-wide block whitespace-nowrap mb-0.5">
                {card.title}
              </span>
              {/* Valor da métrica */}
              <div className="text-base sm:text-lg lg:text-xl xl:text-[22px] font-black text-white tracking-tight tabular-nums whitespace-nowrap">
                {card.value}
              </div>
            </div>
            {getIcon(card.id)}
          </div>

          {/* Indicador secundário / tendência */}
          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs text-[#20C997] font-semibold whitespace-nowrap pt-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
              <span className="text-slate-300 font-medium">{card.trend}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
