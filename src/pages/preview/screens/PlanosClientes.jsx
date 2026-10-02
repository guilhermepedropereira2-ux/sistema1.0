import { Plus, Crown } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { CLIENT_PLANS, BRL } from "../data";

const STATUS_TONE = {
  Ativo: "profit",
  Atrasado: "loss",
  Cancelado: "muted",
};

export default function PlanosClientes() {
  return (
    <>
      <PreviewHeader
        title="Planos & Assinaturas de Clientes"
        subtitle="Gestão de planos recorrentes de clientes. Renovação automática e controle de inadimplência."
        period="Setembro 2026"
        kpi="162 assinantes"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="planos-clientes-new">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Novo plano
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="MRR Planos" value={BRL(12450)} accent="gold" delta="+8%" positive />
        <KpiCard label="Assinantes Ativos" value="158" accent="profit" />
        <KpiCard label="Inadimplência" value="4" accent="loss" note="2.5% da base" />
        <KpiCard label="Churn Mensal" value="1.8%" accent="muted" note="Média do setor: 4%" />
      </div>

      {/* Cards de planos comercializados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { name: "Mensal", price: 89, count: 124, features: ["3 cortes/mês", "Sobrancelha grátis", "10% em produtos"] },
          { name: "VIP", price: 199, count: 38, features: ["Cortes ilimitados", "Barba + Sobrancelha", "15% em produtos", "Agendamento prioritário"], featured: true },
          { name: "Trimestral", price: 239, count: 6, features: ["Cortes ilimitados", "10% em produtos", "Renovação trimestral"] },
        ].map((p) => (
          <div
            key={p.name}
            className={`rounded-[4px] border p-5 ${
              p.featured ? "border-[#D4AF37]/50 bg-[#D4AF37]/[0.04]" : "border-white/[0.08] bg-[#131622]"
            }`}
          >
            {p.featured && (
              <div className="flex items-center gap-1.5 mb-2">
                <Crown className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Mais escolhido</span>
              </div>
            )}
            <p className="font-display text-base font-bold text-white">{p.name}</p>
            <p className="mt-1">
              <span className="font-display text-2xl font-bold text-[#D4AF37]">{BRL(p.price)}</span>
              <span className="text-xs text-slate-400"> / mês</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-2">{p.count} assinantes ativos</p>
            <ul className="space-y-1.5 mt-4 pt-4 border-t border-white/[0.06]">
              {p.features.map((f) => (
                <li key={f} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4AF37] mt-2 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Assinaturas ativas</p>
          <PB tone="muted">{CLIENT_PLANS.length}</PB>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Cliente</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Plano</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Cliente desde</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Renova em</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Status</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Mensalidade</th>
            </tr>
          </thead>
          <tbody>
            {CLIENT_PLANS.map((c, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                <td className="px-2 py-2.5 font-semibold text-white">{c.client}</td>
                <td className="px-2 py-2.5">
                  <PB tone={c.plan === "VIP" ? "gold" : "info"}>
                    {c.plan === "VIP" && <Crown className="h-3 w-3" />}
                    {c.plan}
                  </PB>
                </td>
                <td className="px-2 py-2.5 text-slate-400 hidden md:table-cell">{c.since}</td>
                <td className="px-2 py-2.5 font-mono text-slate-300">{c.renews}</td>
                <td className="px-2 py-2.5 text-center"><PB tone={STATUS_TONE[c.status]}>{c.status}</PB></td>
                <td className="px-2 py-2.5 text-right font-mono font-bold text-[#D4AF37]">{BRL(c.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}