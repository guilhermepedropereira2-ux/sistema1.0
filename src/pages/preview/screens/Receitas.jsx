import { Search, Filter, Plus, Download, TrendingUp } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { REVENUES, BRL } from "../data";

const METHOD_TONE = {
  PIX: "profit",
  Crédito: "info",
  Débito: "info",
  Dinheiro: "muted",
};

export default function Receitas() {
  return (
    <>
      <PreviewHeader
        title="Receitas & Histórico"
        subtitle="Cada atendimento registrado no sistema, com taxa descontada na fonte e líquido pronto."
        period="Setembro 2026"
        kpi="247 lançamentos"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="h-9 px-3 text-xs font-bold text-slate-200 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[4px] flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
              Exportar
            </button>
            <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="receitas-new">
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              Novo
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Receita Bruta" value={BRL(28450)} delta="+18%" positive accent="white" />
        <KpiCard label="Taxas (4.78%)" value={BRL(-1360)} accent="loss" note="Descontadas na fonte" />
        <KpiCard label="Receita Líquida" value={BRL(27090)} accent="profit" note="Caixa real" />
        <KpiCard label="Ticket Médio" value={BRL(55.5)} accent="gold" note="Por atendimento" />
      </div>

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Lançamentos</p>
            <PB tone="muted">247</PB>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar cliente, barbeiro..."
                className="h-9 pl-8 pr-3 text-xs bg-[#0F121C] border border-white/10 rounded-[4px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/40 w-56"
              />
            </div>
            <button type="button" className="h-9 px-3 text-xs font-bold text-slate-200 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[4px] flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#D4AF37]" />
              Filtros
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Data</th>
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Cliente</th>
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Serviço</th>
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden lg:table-cell">Barbeiro</th>
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Forma</th>
                <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Bruto</th>
                <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Taxa</th>
                <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {REVENUES.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  <td className="px-2 py-2.5 font-mono text-slate-400">{r.date}</td>
                  <td className="px-2 py-2.5 font-semibold text-white">{r.client}</td>
                  <td className="px-2 py-2.5 text-slate-300 hidden md:table-cell">{r.service}</td>
                  <td className="px-2 py-2.5 text-slate-400 hidden lg:table-cell">{r.barber}</td>
                  <td className="px-2 py-2.5"><PB tone={METHOD_TONE[r.method]}>{r.method}</PB></td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold text-white">{BRL(r.gross)}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-rose-300 hidden md:table-cell">{BRL(-r.fee)}</td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold text-emerald-400">{BRL(r.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#D4AF37]/30 bg-[#D4AF37]/[0.04]">
                <td colSpan={5} className="px-2 py-3 text-[10px] uppercase font-bold tracking-wider text-[#D4AF37]">Total do dia</td>
                <td className="px-2 py-3 text-right font-mono font-bold text-white">{BRL(300)}</td>
                <td className="px-2 py-3 text-right font-mono font-bold text-rose-300 hidden md:table-cell">{BRL(-8.9)}</td>
                <td className="px-2 py-3 text-right font-mono font-bold text-emerald-400">{BRL(291.1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}