import { TrendingUp, TrendingDown, FileText, Download } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { DAILY_FLOW, BRL } from "../data";

const DRE_ROWS = [
  { label: "(+) Faturamento Bruto", value: 28450, type: "plus" },
  { label: "(−) Taxas Maquininhas", value: -1360, type: "minus" },
  { label: "(=) Receita Líquida", value: 27090, type: "eq", bold: true },
  { label: "(−) Comissões Barbeiros", value: -13210, type: "minus" },
  { label: "(=) Margem de Contribuição", value: 13880, type: "eq", bold: true },
  { label: "(−) Despesas Fixas", value: -4030, type: "minus" },
  { label: "(−) Insumos", value: -460, type: "minus" },
  { label: "(−) Marketing", value: -350, type: "minus" },
  { label: "(=) Lucro Operacional", value: 9040, type: "eq", bold: true, gold: true },
  { label: "(−) Retiradas do Dono", value: -4000, type: "minus" },
  { label: "(=) Caixa Disponível", value: 5040, type: "eq", bold: true, profit: true },
];

export default function FluxoCaixa() {
  return (
    <>
      <PreviewHeader
        title="Fluxo de Caixa & DRE"
        subtitle="Demonstrativo de Resultados em tempo real: do faturamento bruto ao lucro disponível."
        period="Setembro 2026"
        kpi="DRE Consolidado"
        actions={
          <button
            type="button"
            className="h-9 px-3 text-xs font-bold text-slate-200 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[4px] flex items-center gap-1.5 transition-colors"
            data-testid="fluxo-export-pdf"
          >
            <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
            Exportar PDF
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Entradas" value={BRL(28450)} delta="+18%" positive accent="white" />
        <KpiCard label="Saídas" value={BRL(-19410)} delta="-4%" positive accent="loss" />
        <KpiCard label="Resultado Operacional" value={BRL(9040)} accent="gold" note="Margem 31,8%" />
        <KpiCard label="Caixa Disponível" value={BRL(5040)} accent="profit" note="Para retirada" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* DRE detalhada */}
        <div className="lg:col-span-3 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">DRE — Setembro 2026</p>
                <p className="text-xs text-slate-400 mt-0.5">Apurado automaticamente</p>
              </div>
            </div>
            <PB tone="profit">Fechado</PB>
          </div>
          <div className="space-y-1">
            {DRE_ROWS.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-[3px] px-3 py-2 text-xs ${
                  r.bold
                    ? r.profit
                      ? "bg-emerald-500/[0.08] border border-emerald-500/30"
                      : r.gold
                      ? "bg-[#D4AF37]/[0.08] border border-[#D4AF37]/30"
                      : "bg-white/[0.04] border border-white/[0.08]"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <span className={`${r.bold ? "font-bold text-white" : "text-slate-300"} ${r.type === "eq" ? "uppercase tracking-wide" : ""}`}>
                  {r.label}
                </span>
                <span
                  className={`font-mono font-bold ${
                    r.profit ? "text-emerald-400" : r.gold ? "text-[#D4AF37]" : r.value < 0 ? "text-rose-300" : "text-white"
                  }`}
                >
                  {BRL(r.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Evolução semanal */}
        <div className="lg:col-span-2 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Evolução Semanal</p>
            <PB tone="gold">R$ 1.150/dia</PB>
          </div>
          <div className="h-44 flex items-end gap-1.5 pt-2 mb-2">
            {DAILY_FLOW.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-mono font-bold text-slate-400">{d.value > 1500 ? "2k" : `${(d.value / 100).toFixed(1)}k`}</span>
                <div className="w-full h-full flex items-end">
                  <div
                    className={`w-full rounded-t-[2px] transition-all ${
                      d.peak ? "bg-[#D4AF37]" : "bg-[#D4AF37]/30"
                    }`}
                    style={{ height: `${d.height}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-500">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-slate-400">Pico</p>
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Sábado
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Vale</p>
              <p className="text-xs font-bold text-rose-300 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Domingo
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Tendência</p>
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +18%
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}