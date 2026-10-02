import { Clock, UserPlus, Play, Pause, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { PreviewHeader, KpiCard, PB, Avatar } from "../PreviewShell";
import { APPOINTMENTS_TODAY, QUEUE_LIVE, BRL } from "../data";

export default function Operacional() {
  return (
    <>
      <PreviewHeader
        title="Fila & Agenda do Dia"
        subtitle="Acompanhe a fila em tempo real. Atualize status, encaixe clientes e mantenha o balcão sincronizado."
        period="Quarta, 23 de Setembro"
        kpi="Operação ativa"
        actions={
          <button
            type="button"
            className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider transition-colors flex items-center gap-1.5"
            data-testid="operacional-new-appointment"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Novo Atendimento
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Em Atendimento" value="1" accent="gold" note="Matheus Lima" testid="kpi-em-atendimento" />
        <KpiCard label="Aguardando" value="6" note="Próximo: Felipe T." testid="kpi-aguardando" />
        <KpiCard label="Concluídos Hoje" value="21" delta="+14%" positive note="R$ 1.240,00" testid="kpi-concluidos" />
        <KpiCard label="Tempo Médio" value="32 min" note="Meta: 30 min" testid="kpi-tempo-medio" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fila ao vivo */}
        <div className="lg:col-span-2 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Agenda do Dia</p>
              <p className="text-xs text-slate-400 mt-0.5">8 agendamentos · 1 em andamento</p>
            </div>
            <PB tone="gold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ao vivo
            </PB>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Hora</th>
                  <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Cliente</th>
                  <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Serviço</th>
                  <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden lg:table-cell">Barbeiro</th>
                  <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Status</th>
                  <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {APPOINTMENTS_TODAY.map((a, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.03] ${
                      a.live ? "bg-[#D4AF37]/[0.04]" : ""
                    }`}
                  >
                    <td className="px-2 py-2.5 font-mono font-bold text-[#D4AF37]">{a.time}</td>
                    <td className="px-2 py-2.5 font-semibold text-white">{a.client}</td>
                    <td className="px-2 py-2.5 text-slate-300 hidden md:table-cell">{a.service}</td>
                    <td className="px-2 py-2.5 text-slate-400 hidden lg:table-cell">{a.barber}</td>
                    <td className="px-2 py-2.5">
                      {a.status === "Concluído" && <PB tone="profit"><CheckCircle2 className="h-3 w-3" /> {a.status}</PB>}
                      {a.status === "Em andamento" && <PB tone="gold"><span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] animate-pulse" /> {a.status}</PB>}
                      {a.status === "Aguardando" && <PB tone="muted"><Clock className="h-3 w-3" /> {a.status}</PB>}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {a.status === "Aguardando" && (
                          <button type="button" className="h-7 w-7 rounded-[3px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 flex items-center justify-center" title="Iniciar">
                            <Play className="h-3 w-3 fill-current" />
                          </button>
                        )}
                        {a.live && (
                          <button type="button" className="h-7 w-7 rounded-[3px] bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 flex items-center justify-center" title="Pausar">
                            <Pause className="h-3 w-3 fill-current" />
                          </button>
                        )}
                        {a.status === "Concluído" && (
                          <button type="button" className="h-7 w-7 rounded-[3px] bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 flex items-center justify-center" title="Recibo">
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fila atual */}
        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Fila Atual</p>
            <PB tone="info">3 na fila</PB>
          </div>
          <div className="space-y-2">
            {QUEUE_LIVE.map((q) => (
              <div key={q.pos} className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-black flex items-center justify-center">
                      {q.pos}
                    </span>
                    <p className="text-xs font-bold text-white">{q.client}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#D4AF37]">ETA {q.eta}</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-1.5">com {q.barber}</p>
                <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E6CA65]"
                    style={{ width: `${q.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full mt-4 h-9 text-xs font-bold uppercase tracking-wider text-slate-300 border border-white/10 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] rounded-[3px] transition-colors flex items-center justify-center gap-1.5"
            data-testid="operacional-view-full-queue"
          >
            Ver fila completa <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </>
  );
}