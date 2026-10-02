import { Plus, HandCoins } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { WITHDRAWALS, BRL } from "../data";

export default function Retiradas() {
  return (
    <>
      <PreviewHeader
        title="Retiradas do Dono"
        subtitle="Histórico de retiradas para pró-labore e investimentos. Valor sempre desconta do caixa disponível."
        period="Setembro 2026"
        kpi="4 retiradas"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="retiradas-new">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Nova retirada
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Total do Mês" value={BRL(4000)} accent="gold" />
        <KpiCard label="Caixa Disponível" value={BRL(5040)} accent="profit" note="Após retiradas" />
        <KpiCard label="Média Mensal" value={BRL(3875)} accent="white" note="Últimos 4 meses" />
        <KpiCard label="Limite Recomendado" value={BRL(6500)} accent="muted" note="Para não comprometer o caixa" />
      </div>

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Histórico de retiradas</p>
          <PB tone="gold">4 neste mês</PB>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Data</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Descrição</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Forma</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {WITHDRAWALS.map((w) => (
              <tr key={w.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                <td className="px-2 py-2.5 font-mono text-slate-400">{w.date}</td>
                <td className="px-2 py-2.5 font-semibold text-white">{w.note}</td>
                <td className="px-2 py-2.5"><PB tone={w.method === "PIX" ? "profit" : "info"}>{w.method}</PB></td>
                <td className="px-2 py-2.5 text-right font-mono font-bold text-[#D4AF37]">{BRL(-w.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5 flex items-start gap-4">
        <div className="h-10 w-10 rounded-[4px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
          <HandCoins className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Boas práticas de retirada</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Recomendamos retirar no máximo 70% do lucro operacional mensal. O restante deve permanecer no caixa para cobrir comissões futuras e despesas variáveis.
          </p>
        </div>
      </div>
    </>
  );
}