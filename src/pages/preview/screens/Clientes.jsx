import { UserPlus, Search, Filter, Crown } from "lucide-react";
import { PreviewHeader, KpiCard, PB, Avatar } from "../PreviewShell";
import { CLIENTS, BRL } from "../data";

const PLAN_TONE = {
  VIP: "gold",
  Mensal: "profit",
  Avulso: "muted",
};

export default function Clientes() {
  return (
    <>
      <PreviewHeader
        title="Clientes"
        subtitle="Base completa de clientes com LTV, plano ativo e último atendimento registrado."
        period={`${CLIENTS.length} clientes ativos`}
        kpi="LTV médio R$ 1.530"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="clientes-new">
            <UserPlus className="h-3.5 w-3.5 stroke-[3]" />
            Novo cliente
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Total de Clientes" value="486" accent="white" delta="+22" positive />
        <KpiCard label="Plano VIP" value="38" accent="gold" note="8% da base" />
        <KpiCard label="Plano Mensal" value="124" accent="profit" note="26% da base" />
        <KpiCard label="LTV Médio" value={BRL(1530)} accent="muted" note="Últimos 12 meses" />
      </div>

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Listagem</p>
            <PB tone="muted">{CLIENTS.length}</PB>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Nome, telefone ou plano..."
                className="h-9 pl-8 pr-3 text-xs bg-[#0F121C] border border-white/10 rounded-[4px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/40 w-56"
              />
            </div>
            <button type="button" className="h-9 px-3 text-xs font-bold text-slate-200 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[4px] flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#D4AF37]" />
              Plano
            </button>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Cliente</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Telefone</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Visitas</th>
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Última visita</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Plano</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">LTV</th>
            </tr>
          </thead>
          <tbody>
            {CLIENTS.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar initials={c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")} size={7} />
                    <span className="font-semibold text-white">{c.name}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 font-mono text-slate-300 hidden md:table-cell">{c.phone}</td>
                <td className="px-2 py-2.5 text-center font-mono font-bold text-white">{c.visits}</td>
                <td className="px-2 py-2.5 text-slate-400 hidden md:table-cell">{c.lastVisit}</td>
                <td className="px-2 py-2.5 text-center">
                  <PB tone={PLAN_TONE[c.plan]}>
                    {c.plan === "VIP" && <Crown className="h-3 w-3" />}
                    {c.plan}
                  </PB>
                </td>
                <td className="px-2 py-2.5 text-right font-mono font-bold text-[#D4AF37]">{BRL(c.ltv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}