import React from "react";
import { Scissors, CircleDollarSign, Tag, Users, ArrowUp } from "lucide-react";

export default function AtendimentosMetrics({ metrics }) {
  const cards = [
    {
      id: "atendimentos",
      title: "Atendimentos hoje",
      value: String(metrics?.totalCount ?? 0),
      trend: (metrics?.countTrend ?? "0%").replace(/^\+\s*/, ""),
      trendColor: "text-[#20C997]",
      comparison: `Ontem: ${metrics?.yesterdayCount ?? 0}`,
      icon: Scissors,
      iconClass: "bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#E5C365]",
    },
    {
      id: "faturamento",
      title: "Faturamento hoje",
      value: `R$ ${Number(metrics?.totalRevenue ?? 0).toFixed(2).replace(".", ",")}`,
      trend: (metrics?.revenueTrend ?? "0%").replace(/^\+\s*/, ""),
      trendColor: "text-[#20C997]",
      comparison: `Ontem: R$ ${Number(metrics?.yesterdayRevenue ?? 0).toFixed(2).replace(".", ",")}`,
      icon: CircleDollarSign,
      iconClass: "bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#E5C365]",
    },
    {
      id: "descontos",
      title: "Descontos",
      value: `R$ ${Number(metrics?.totalDiscounts ?? 0).toFixed(2).replace(".", ",")}`,
      trend: (metrics?.discountTrend ?? "0%").replace(/^\+\s*/, ""),
      trendColor: "text-[#EF4444]",
      comparison: `Ontem: R$ ${Number(metrics?.yesterdayDiscount ?? 0).toFixed(2).replace(".", ",")}`,
      icon: Tag,
      iconClass: "bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]",
    },
    {
      id: "comissoes",
      title: "Comissões",
      value: `R$ ${Number(metrics?.totalCommissions ?? 0).toFixed(2).replace(".", ",")}`,
      trend: (metrics?.commissionTrend ?? "0%").replace(/^\+\s*/, ""),
      trendColor: "text-[#20C997]",
      comparison: `Ontem: R$ ${Number(metrics?.yesterdayCommission ?? 0).toFixed(2).replace(".", ",")}`,
      icon: Users,
      iconClass: "bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#E5C365]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4 select-none w-full">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="p-3 sm:p-4 rounded-2xl bg-[#0A0E15] border border-[#161E2C] shadow-xl flex flex-col justify-between min-h-[136px] sm:min-h-[148px] overflow-hidden"
          >
            {/* 1. Ícone no topo */}
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconClass}`}>
              <Icon className="w-4 h-4" />
            </div>

            {/* 2. Conteúdo textual e valores com alinhamento vertical rigoroso */}
            <div className="mt-2.5 sm:mt-3 flex-1 flex flex-col justify-between min-w-0">
              {/* Título do Card */}
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium block truncate">
                {card.title}
              </span>

              {/* Linha do Valor Principal e Indicador Percentual com Seta */}
              <div className="flex items-baseline justify-between gap-1 my-1 flex-nowrap">
                <span className="text-base sm:text-xl lg:text-2xl font-black text-white leading-none tracking-tight tabular-nums truncate">
                  {card.value}
                </span>
                <span className={`text-[10.5px] sm:text-[11px] font-bold flex items-center gap-0.5 shrink-0 ${card.trendColor}`}>
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  <span>{card.trend}</span>
                </span>
              </div>

              {/* Texto comparativo (ex: Ontem: R$ 665,00) */}
              <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                {card.comparison}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
