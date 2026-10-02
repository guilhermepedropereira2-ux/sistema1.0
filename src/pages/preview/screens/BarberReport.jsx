import { Phone, Mail, Award, Calendar } from "lucide-react";
import { PreviewHeader, KpiCard, PB, Avatar } from "../PreviewShell";
import { DAILY_FLOW, BRL } from "../data";

export default function BarberReport() {
  const barber = {
    initials: "RC",
    name: "Rodrigo Costa",
    role: "Sênior · 6 anos de experiência",
    phone: "(11) 98765-4321",
    email: "rodrigo@vintage.com",
    commission: 50,
    since: "Março 2023",
  };

  return (
    <>
      <PreviewHeader
        title="Relatório: Rodrigo Costa"
        subtitle="Desempenho individual do barbeiro no mês. Acesso restrito ao dono."
        period="Setembro 2026"
        kpi="Top performer"
      />

      {/* Header do barbeiro */}
      <div className="rounded-[4px] border border-[#D4AF37]/30 bg-gradient-to-br from-[#131622] to-[#0F121C] p-6 mb-6 flex flex-col sm:flex-row items-start gap-4">
        <Avatar initials={barber.initials} size={16} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-xl font-bold text-white">{barber.name}</h2>
            <PB tone="gold"><Award className="h-3 w-3" /> Top 1</PB>
            <PB tone="profit">Ativo</PB>
          </div>
          <p className="text-sm text-slate-400">{barber.role}</p>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-[#D4AF37]" /> {barber.phone}</span>
            <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-[#D4AF37]" /> {barber.email}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-[#D4AF37]" /> Desde {barber.since}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Comissão vigente</p>
          <p className="font-display text-2xl font-bold text-[#D4AF37] mt-1">{barber.commission}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Cortes no Mês" value="154" accent="white" delta="+12" positive />
        <KpiCard label="Faturamento Gerado" value={BRL(8470)} accent="gold" note="Bruto" />
        <KpiCard label="Comissão Total" value={BRL(4314.7)} accent="profit" note="Líquida após taxas" />
        <KpiCard label="Ticket Médio" value={BRL(55)} accent="muted" note="Por atendimento" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80 mb-4">Atendimentos por dia</p>
          <div className="h-44 flex items-end gap-1.5 pt-2">
            {DAILY_FLOW.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-full flex items-end">
                  <div
                    className={`w-full rounded-t-[2px] ${d.peak ? "bg-[#D4AF37]" : "bg-[#D4AF37]/30"}`}
                    style={{ height: `${d.height}%` }}
                  />
                </div>
                <span className={`text-[9px] font-bold ${d.peak ? "text-[#D4AF37]" : "text-slate-500"}`}>
                  {d.short}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80 mb-4">Top serviços do mês</p>
          <ul className="space-y-3">
            {[
              { name: "Combo Cabelo + Barba", count: 48, gross: 4560 },
              { name: "Corte Degradê", count: 62, gross: 3410 },
              { name: "Barba Terapia", count: 28, gross: 1400 },
              { name: "Pigmentação", count: 12, gross: 1440 },
            ].map((s) => (
              <li key={s.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold truncate">{s.name}</span>
                  <span className="font-mono font-bold text-[#D4AF37]">{BRL(s.gross)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.count} vendas</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}