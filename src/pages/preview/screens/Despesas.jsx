import { Plus, Filter, Download, Wallet, Repeat } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { EXPENSES, BRL } from "../data";

const CATEGORY_TONE = {
  Aluguel: "info",
  Insumos: "gold",
  Marketing: "profit",
  Contas: "muted",
  Folha: "loss",
};

export default function Despesas() {
  return (
    <>
      <PreviewHeader
        title="Despesas Operacionais"
        subtitle="Controle cada saída por categoria. Despesas recorrentes entram automaticamente todo mês."
        period="Setembro 2026"
        kpi="5 categorias"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="despesas-new">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Nova despesa
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Total no Mês" value={BRL(4840)} delta="-3%" positive accent="loss" />
        <KpiCard label="Fixas" value={BRL(3570)} accent="muted" note="Aluguel, contas, marketing" />
        <KpiCard label="Variáveis" value={BRL(1270)} accent="gold" note="Insumos, vales" />
        <KpiCard label="Crescimento MoM" value="-3.2%" accent="profit" note="vs. Agosto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Lançamentos do Mês</p>
            <button type="button" className="h-8 px-3 text-xs font-bold text-slate-200 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[3px] flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#D4AF37]" />
              Categoria
            </button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Data</th>
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Categoria</th>
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Descrição</th>
                <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Recorrente</th>
                <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {EXPENSES.map((d) => (
                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  <td className="px-2 py-2.5 font-mono text-slate-400">{d.date}</td>
                  <td className="px-2 py-2.5"><PB tone={CATEGORY_TONE[d.category]}>{d.category}</PB></td>
                  <td className="px-2 py-2.5 font-semibold text-white">{d.description}</td>
                  <td className="px-2 py-2.5 text-center">
                    {d.recurring ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                        <Repeat className="h-3 w-3" /> SIM
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] font-bold">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold text-rose-300">{BRL(-d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Distribuição por categoria */}
        <div className="lg:col-span-2 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80 mb-4">Distribuição por categoria</p>
          <div className="space-y-3">
            {[
              { name: "Aluguel", value: 2800, pct: 58 },
              { name: "Insumos", value: 460, pct: 9.5 },
              { name: "Marketing", value: 350, pct: 7.2 },
              { name: "Contas", value: 420, pct: 8.7 },
              { name: "Folha", value: 200, pct: 4.1 },
            ].map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">{c.name}</span>
                  <span className="font-mono font-bold text-rose-300">{BRL(c.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#EF4444]" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-[3px] bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-rose-300" />
              </div>
              <span className="text-xs text-slate-400">Total acumulado</span>
            </div>
            <span className="font-mono font-bold text-rose-300 text-sm">{BRL(4840)}</span>
          </div>
        </div>
      </div>
    </>
  );
}