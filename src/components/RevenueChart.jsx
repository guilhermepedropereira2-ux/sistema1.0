import React, { useState } from "react";
import { BarChart3 } from "lucide-react";

export default function RevenueChart({ data = [], totalRevenue = 0 }) {
  const [activeDayIndex, setActiveDayIndex] = useState(null);

  // If no data provided or empty, render a graceful empty state
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl bg-[#0D121B] border border-[#161e2c] p-6 shadow-xl flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#E5C365] mb-2">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white">Evolução de Faturamento</h3>
        <p className="text-xs text-slate-400 mt-1">Nenhum faturamento registrado no período selecionado</p>
      </div>
    );
  }

  // Calculate maximum for scaling
  const maxVal = Math.max(...data.map((d) => Number(d.total || d.faturamento || 0)), 100);
  // Round up to nearest nice round number
  const maxScale = Math.ceil(maxVal * 1.15);

  const yLabels = [
    Math.round(maxScale),
    Math.round(maxScale * 0.75),
    Math.round(maxScale * 0.5),
    Math.round(maxScale * 0.25),
    0,
  ];

  return (
    <div className="rounded-2xl bg-[#0D121B] border border-[#161e2c] p-4 sm:p-5 lg:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 sm:p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#E5C365] mt-0.5">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-white tracking-tight">
              Evolução de Faturamento
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Receita de serviços e produtos por dia
            </p>
          </div>
        </div>

        {/* Legenda & Total */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center gap-2.5 text-[11px] sm:text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E5C365] shadow-[0_0_6px_rgba(229,195,101,0.5)]" />
              <span>Serviços</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#475569]" />
              <span>Produtos</span>
            </div>
          </div>
          {totalRevenue > 0 && (
            <span className="text-[11px] font-mono font-bold text-[#E5C365] bg-[#D4AF37]/10 px-2 py-0.5 rounded-lg border border-[#D4AF37]/20">
              R$ {totalRevenue.toFixed(2).replace(".", ",")}
            </span>
          )}
        </div>
      </div>

      {/* Área do Gráfico */}
      <div className="relative h-56 sm:h-64 lg:h-72 xl:h-[280px] w-full pt-4 select-none">
        {/* Linhas Horizontais e Eixo Y */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7 text-[10px] sm:text-[11px] text-slate-400 font-mono tabular-nums">
          {yLabels.map((val) => (
            <div key={val} className="flex items-center w-full">
              <span className="w-10 sm:w-14 text-right pr-2 sm:pr-3 shrink-0">
                R$ {val}
              </span>
              <div className="flex-1 border-b border-dashed border-[#16202e]" />
            </div>
          ))}
        </div>

        {/* Barras Empilhadas */}
        <div className="absolute left-10 sm:left-14 right-1 sm:right-2 top-0 bottom-7 flex items-end justify-between gap-1 sm:gap-2 px-1 sm:px-2">
          {data.map((d, index) => {
            const tot = Number(d.total || d.faturamento || 0);
            const serv = Number(d.servicos || 0);
            const prod = Number(d.produtos || 0);
            const totalPct = Math.min((tot / maxScale) * 100, 100);
            const isActive = index === activeDayIndex;

            return (
              <div
                key={d.day || d.dia || index}
                onMouseEnter={() => setActiveDayIndex(index)}
                onClick={() => setActiveDayIndex(index)}
                className="relative flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
              >
                {/* Destaque sutil de coluna ativa */}
                {isActive && (
                  <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-[#D4AF37]/20 via-[#D4AF37]/5 to-transparent rounded-t-lg pointer-events-none" />
                )}

                {/* Tooltip flutuante fiel ao Kupola 2.0 */}
                {isActive && (
                  <div className="absolute -top-16 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-[#05070B] border border-[#222c3d] rounded-xl px-2.5 sm:px-3 py-1.5 shadow-2xl text-left whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 mb-0.5">
                        <span>{d.dateStr || d.date || d.day || d.dia}</span>
                        <span className="text-white font-bold tabular-nums">
                          R$ {tot.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="text-[10px] flex items-center gap-1 text-[#E5C365]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E5C365]" />
                        <span>Serviços: R$ {serv.toFixed(2).replace(".", ",")}</span>
                      </div>
                      <div className="text-[10px] flex items-center gap-1 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#64748b]" />
                        <span>Produtos: R$ {prod.toFixed(2).replace(".", ",")}</span>
                      </div>
                    </div>
                    {/* Triângulo do Tooltip */}
                    <div className="w-2 h-2 bg-[#05070B] border-r border-b border-[#222c3d] transform rotate-45 -mt-1" />
                  </div>
                )}

                {/* Barra Empilhada */}
                <div
                  style={{ height: `${Math.max(totalPct, tot > 0 ? 3 : 0)}%` }}
                  className={`w-full max-w-[24px] sm:max-w-[28px] rounded-t-md flex flex-col overflow-hidden transition-all duration-300 ${
                    isActive
                      ? "ring-2 ring-[#E5C365] shadow-[0_0_12px_rgba(229,195,101,0.35)]"
                      : "opacity-85 group-hover:opacity-100"
                  }`}
                >
                  {/* Top: Produtos (Slate) */}
                  {prod > 0 && (
                    <div
                      style={{ height: `${tot > 0 ? (prod / tot) * 100 : 0}%` }}
                      className="w-full bg-[#3b4759] group-hover:bg-[#475569] transition-colors"
                    />
                  )}
                  {/* Bottom: Serviços (Gold gradient) */}
                  <div
                    style={{ height: `${tot > 0 ? (serv / tot) * 100 : 100}%` }}
                    className="w-full bg-gradient-to-t from-[#B38F24] via-[#D4AF37] to-[#E5C365] group-hover:brightness-110 transition-all flex-1"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Eixo X com Dias */}
        <div className="absolute left-10 sm:left-14 right-1 sm:right-2 bottom-0 flex justify-between gap-1 sm:gap-2 px-1 sm:px-2 text-[10px] sm:text-[11px] text-slate-400 font-mono">
          {data.map((d, index) => {
            const isActive = index === activeDayIndex;
            return (
              <div
                key={d.day || d.dia || index}
                onClick={() => setActiveDayIndex(index)}
                className={`flex-1 text-center cursor-pointer transition-colors ${
                  isActive ? "text-[#E5C365] font-bold" : "hover:text-slate-200"
                }`}
              >
                {d.day || d.dia}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
