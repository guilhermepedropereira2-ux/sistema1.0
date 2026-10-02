import { Award } from "lucide-react";
import { PreviewHeader, PB } from "../PreviewShell";
import { BRL } from "../data";

const COMPARISON = [
  { name: "Stone - Principal", debit: 1.49, credVista: 2.79, credParcelado: 4.49, vol: 12000, total: 358, recommended: true },
  { name: "Cielo - Loja 01", debit: 1.39, credVista: 2.69, credParcelado: 4.39, vol: 8400, total: 264 },
  { name: "Mercado Pago", debit: 1.59, credVista: 2.89, credParcelado: 4.59, vol: 5200, total: 156 },
  { name: "PagSeguro", debit: 1.69, credVista: 2.99, credParcelado: 4.69, vol: 2850, total: 92 },
];

export default function Comparacao() {
  return (
    <>
      <PreviewHeader
        title="Comparar Maquininhas"
        subtitle="Qual adquirente deixa mais dinheiro no caixa? Comparação por volume e taxas efetivas."
        period="Setembro 2026"
        kpi="Comparativo mensal"
      />

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Adquirente</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Volume</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Débito</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Crédito à vista</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden lg:table-cell">Crédito parcelado</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Taxa efetiva</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Recomendação</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((c) => {
              const totalVol = COMPARISON.reduce((acc, x) => acc + x.vol, 0);
              const pct = (c.vol / totalVol) * 100;
              const isWinner = c.recommended;
              return (
                <tr key={c.name} className={`border-b border-white/[0.04] hover:bg-white/[0.03] ${isWinner ? "bg-[#D4AF37]/[0.04]" : ""}`}>
                  <td className="px-2 py-2.5 font-semibold text-white">{c.name}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-300">
                    {BRL(c.vol)}
                    <div className="mt-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className={`h-full ${isWinner ? "bg-[#D4AF37]" : "bg-blue-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-400 hidden md:table-cell">{c.debit.toFixed(2)}%</td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-400 hidden md:table-cell">{c.credVista.toFixed(2)}%</td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-400 hidden lg:table-cell">{c.credParcelado.toFixed(2)}%</td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold text-rose-300">{BRL(c.total)}</td>
                  <td className="px-2 py-2.5 text-center">
                    {isWinner ? (
                      <PB tone="gold"><Award className="h-3 w-3" /> Melhor</PB>
                    ) : (
                      <PB tone="muted">—</PB>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "Pix representa 40%", desc: "das vendas — recomendação: priorizar taxa zero." },
          { title: "Stone - 1,49% débito", desc: "segue como opção mais barata no débito." },
          { title: "Mercado Pago caro", desc: "no crédito parcelado. Avaliar trocar de adquirente." },
        ].map((t) => (
          <div key={t.title} className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-4">
            <p className="text-xs font-bold text-[#D4AF37]">{t.title}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}