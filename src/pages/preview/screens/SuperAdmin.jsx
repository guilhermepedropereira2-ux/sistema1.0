import { Globe2, AlertCircle, DollarSign } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { SUPERADMIN_ORGS, BRL } from "../data";

export default function SuperAdmin() {
  return (
    <>
      <PreviewHeader
        title="Painel SuperAdmin"
        subtitle="Visão multi-tenant da plataforma. Gestão de organizações, planos, MRR e cobrança."
        period="Snapshot — 23/09/2026"
        kpi="Master Control"
        actions={
          <PB tone="gold"><AlertCircle className="h-3 w-3" /> Apenas para master</PB>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Organizações" value="284" accent="white" delta="+12" positive />
        <KpiCard label="MRR Plataforma" value={BRL(24890)} accent="gold" delta="+6%" positive />
        <KpiCard label="Trial Ativos" value="38" accent="info" note="Convertendo em 14 dias" />
        <KpiCard label="Inadimplência" value="4.2%" accent="loss" note="8 contas em risco" />
      </div>

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5 mb-6">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Globe2 className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Organizações recentes</p>
          </div>
          <PB tone="muted">{SUPERADMIN_ORGS.length} na amostra</PB>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Organização</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Plano</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Status</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">MRR</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Usuários</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden lg:table-cell">Região</th>
            </tr>
          </thead>
          <tbody>
            {SUPERADMIN_ORGS.map((o, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                <td className="px-2 py-2.5 font-semibold text-white">{o.name}</td>
                <td className="px-2 py-2.5 text-center">
                  <PB tone={o.plan === "PREMIUM" ? "gold" : o.plan === "PRO" ? "info" : "muted"}>{o.plan}</PB>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <PB tone={o.status === "Ativa" ? "profit" : o.status === "Trial" ? "info" : "loss"}>{o.status}</PB>
                </td>
                <td className="px-2 py-2.5 text-right font-mono font-bold text-emerald-400">{BRL(o.mrr)}</td>
                <td className="px-2 py-2.5 text-center font-mono text-slate-300 hidden md:table-cell">{o.users}</td>
                <td className="px-2 py-2.5 text-center hidden lg:table-cell"><PB tone="muted">{o.region}</PB></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-[4px] border border-[#D4AF37]/30 bg-[#D4AF37]/[0.04] p-5 flex items-start gap-4">
        <div className="h-10 w-10 rounded-[4px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Saúde financeira da plataforma</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            MRR de {BRL(24890)} crescendo 6% ao mês. LTV médio de R$ 4.200 por organização. Payback de aquisição estimado em 2,3 meses.
          </p>
        </div>
      </div>
    </>
  );
}