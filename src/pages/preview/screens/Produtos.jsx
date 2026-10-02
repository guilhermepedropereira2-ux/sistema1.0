import { Plus, AlertTriangle } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { PRODUCTS, BRL } from "../data";

export default function Produtos() {
  return (
    <>
      <PreviewHeader
        title="Estoque de Produtos"
        subtitle="Gerencie produtos vendidos e utilizados na operação. Estoque mínimo dispara alertas."
        period="Setembro 2026"
        kpi="6 SKUs ativos"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="produtos-new">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Novo produto
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Valor em Estoque" value={BRL(3260)} accent="white" />
        <KpiCard label="Itens Críticos" value="2" accent="loss" note="Abaixo do mínimo" />
        <KpiCard label="Itens Vendidos (mês)" value="38" accent="gold" delta="+14%" positive />
        <KpiCard label="Receita Produtos" value={BRL(1480)} accent="profit" note="27% margem" />
      </div>

      {PRODUCTS.some((p) => p.low) && (
        <div className="mb-6 rounded-[4px] border border-amber-500/30 bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-[3px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">2 produtos abaixo do estoque mínimo</p>
            <p className="text-xs text-slate-400 mt-0.5">Shampoo Antiqueda (6/8) e Cera Matte (3/10). Reposição sugerida esta semana.</p>
          </div>
        </div>
      )}

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Produto</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">SKU</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Categoria</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Estoque</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Mínimo</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Preço</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((p) => (
              <tr key={p.id} className={`border-b border-white/[0.04] hover:bg-white/[0.03] ${p.low ? "bg-amber-500/[0.04]" : ""}`}>
                <td className="px-2 py-2.5 font-semibold text-white">{p.name}</td>
                <td className="px-2 py-2.5 font-mono text-slate-400">{p.sku}</td>
                <td className="px-2 py-2.5 hidden md:table-cell"><PB tone="muted">{p.category}</PB></td>
                <td className="px-2 py-2.5 text-center">
                  <span className={`font-mono font-bold ${p.low ? "text-amber-300" : "text-white"}`}>{p.stock}</span>
                </td>
                <td className="px-2 py-2.5 text-center font-mono text-slate-500">{p.min}</td>
                <td className="px-2 py-2.5 text-right font-mono font-bold text-[#D4AF37]">{BRL(p.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}