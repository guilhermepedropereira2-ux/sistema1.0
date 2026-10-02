import {
  TrendingUp, Users2, Scissors, CalendarDays, ChevronRight,
  CircleDollarSign, ArrowUpRight, Activity,
} from "lucide-react";
import { PreviewHeader, KpiCard, PB, Avatar } from "../PreviewShell";
import {
  SHOP, KPI_OVERVIEW, DAILY_FLOW, BARBERS, COMMISSION_TABLE, BRL,
} from "../data";

export default function Dashboard() {
  const todayGross = 1240;
  const todayAtt = 28;

  return (
    <>
      <PreviewHeader
        title="Visão Geral da Operação"
        subtitle="Acompanhe em tempo real o faturamento, comissões e desempenho da sua equipe neste mês."
        period={SHOP.month}
        kpi="DRE em Tempo Real"
      />

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {KPI_OVERVIEW.map((k) => (
          <KpiCard key={k.testid} {...k} value={BRL(k.value)} />
        ))}
      </div>

      {/* Bloco central: gráfico de fluxo + tabela resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-1 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Fluxo de Faturamento</p>
              <p className="text-xs text-slate-400 mt-0.5">Média diária <span className="text-emerald-400 font-bold">R$ 1.150</span></p>
            </div>
            <PB tone="gold"><Activity className="h-3 w-3" /> 7 dias</PB>
          </div>
          <div className="h-32 flex items-end gap-2 pt-2">
            {DAILY_FLOW.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full h-full flex items-end">
                  <div
                    className={`w-full rounded-t-[2px] transition-all ${
                      d.peak ? "bg-[#D4AF37]" : "bg-[#D4AF37]/25 hover:bg-[#D4AF37]/45"
                    }`}
                    style={{ height: `${d.height}%` }}
                    title={`${d.day}: ${BRL(d.value)}`}
                  />
                </div>
                <span className={`text-[9px] font-bold ${d.peak ? "text-[#D4AF37]" : "text-slate-500"}`}>
                  {d.short}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Extrato Consolidado por Barbeiro</p>
              <p className="text-xs text-slate-400 mt-0.5">Valores líquidos prontos para Pix</p>
            </div>
            <button
              type="button"
              className="text-[11px] font-bold text-[#D4AF37] hover:underline flex items-center gap-1"
              data-testid="dashboard-view-all-barbers"
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {BARBERS.slice(0, 4).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-[3px] p-2.5 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={b.initials} size={9} />
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-xs leading-tight truncate">{b.name}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {b.cuts} cortes · {b.commission}% comissão
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-white font-mono text-xs">{BRL(b.commissionValue)}</span>
                  <span className={`block text-[9px] font-bold mt-0.5 ${b.pixReady ? "text-emerald-400" : "text-slate-500"}`}>
                    {b.pixReady ? "Pronto para Pix" : "Aguardando fechamento"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo do dia + serviços mais vendidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-[4px] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CircleDollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Hoje</p>
              <p className="text-base font-display font-bold text-white leading-tight">{BRL(todayGross)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2.5">
              <p className="text-[10px] text-slate-400">Atendimentos</p>
              <p className="text-base font-bold text-white font-mono">{todayAtt}</p>
            </div>
            <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2.5">
              <p className="text-[10px] text-slate-400">Ticket médio</p>
              <p className="text-base font-bold text-white font-mono">{BRL(todayGross / todayAtt)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Top Serviços (mês)</p>
            <Scissors className="h-3.5 w-3.5 text-[#D4AF37]" />
          </div>
          <ul className="space-y-2">
            {[
              { name: "Combo Cabelo + Barba", count: 142, gross: 13490 },
              { name: "Corte Degradê", count: 198, gross: 10890 },
              { name: "Barba Terapia", count: 96, gross: 4800 },
              { name: "Pigmentação", count: 28, gross: 3360 },
            ].map((s) => (
              <li key={s.name} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="text-[10px] text-slate-400">{s.count} vendas</p>
                </div>
                <span className="font-mono font-bold text-[#D4AF37]">{BRL(s.gross)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Próximos atendimentos</p>
            <PB tone="info"><Activity className="h-3 w-3" /> Ao vivo</PB>
          </div>
          <ul className="space-y-2">
            {[
              { time: "14:15", client: "André Lima", service: "Corte Clássico", barber: "Rodrigo Costa" },
              { time: "15:30", client: "Caio Pereira", service: "Pigmentação", barber: "Rodrigo Costa" },
              { time: "16:30", client: "Pedro Henrique", service: "Combo", barber: "Matheus Lima" },
              { time: "17:00", client: "Lucas Ferreira", service: "Barba Terapia", barber: "Gabriel Alves" },
            ].map((a) => (
              <li key={a.time} className="flex items-start gap-2.5 text-xs rounded-[3px] p-2 hover:bg-white/[0.04] transition-colors">
                <span className="text-[#D4AF37] font-bold font-mono shrink-0">{a.time}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{a.client}</p>
                  <p className="text-[10px] text-slate-400 truncate">{a.service} · {a.barber}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Faixa de atalhos rápidos */}
      <div className="mt-6 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80 mb-3">Ações Rápidas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { label: "Novo Atendimento", icon: Scissors, tone: "gold" },
            { label: "Cadastrar Cliente", icon: Users2, tone: "profit" },
            { label: "Lançar Despesa", icon: TrendingUp, tone: "loss" },
            { label: "Ver Agenda", icon: CalendarDays, tone: "info" },
            { label: "Fechar Caixa", icon: ArrowUpRight, tone: "gold" },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                className="flex items-center gap-2.5 rounded-[3px] border border-white/[0.08] bg-[#0F121C] hover:bg-[#181B28] hover:border-[#D4AF37]/40 p-3 transition-colors text-left"
                data-testid={`quick-action-${a.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`h-7 w-7 rounded-[3px] bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-white">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}