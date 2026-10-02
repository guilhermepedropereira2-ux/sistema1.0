import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PreviewHeader, PB } from "../PreviewShell";

const WEEK = [
  { day: "Seg", date: "21", current: false },
  { day: "Ter", date: "22", current: false },
  { day: "Qua", date: "23", current: true },
  { day: "Qui", date: "24", current: false },
  { day: "Sex", date: "25", current: false },
  { day: "Sáb", date: "26", current: false },
  { day: "Dom", date: "27", current: false },
];

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

// Blocos pré-posicionados por dia/hora/coluna do barbeiro.
const BLOCKS = [
  { day: 0, hour: 1, span: 1, col: 0, label: "Lucas M.", service: "Degradê", barber: "RC", tone: "gold" },
  { day: 0, hour: 2, span: 1, col: 1, label: "Felipe T.", service: "Barba", barber: "ML", tone: "info" },
  { day: 0, hour: 3, span: 1, col: 2, label: "Marcos V.", service: "Combo", barber: "GA", tone: "profit" },
  { day: 1, hour: 1, span: 1, col: 0, label: "Henrique S.", service: "Clássico", barber: "LF", tone: "muted" },
  { day: 1, hour: 4, span: 1, col: 3, label: "Diego O.", service: "Sobrancelha", barber: "RC", tone: "gold" },
  { day: 2, hour: 1, span: 1, col: 0, label: "Lucas M.", service: "Degradê", barber: "RC", tone: "gold", done: true },
  { day: 2, hour: 2, span: 1, col: 1, label: "Marcos V.", service: "Combo", barber: "ML", tone: "info", live: true },
  { day: 2, hour: 3, span: 1, col: 2, label: "Felipe T.", service: "Barba", barber: "GA", tone: "profit" },
  { day: 2, hour: 4, span: 1, col: 0, label: "André L.", service: "Clássico", barber: "RC", tone: "gold" },
  { day: 2, hour: 6, span: 1, col: 3, label: "Caio P.", service: "Pigmentação", barber: "RC", tone: "gold" },
  { day: 3, hour: 2, span: 1, col: 1, label: "Pedro H.", service: "Combo", barber: "ML", tone: "info" },
  { day: 3, hour: 3, span: 1, col: 2, label: "Lucas F.", service: "Barba", barber: "GA", tone: "profit" },
  { day: 4, hour: 1, span: 1, col: 0, label: "Rafa M.", service: "Degradê", barber: "RC", tone: "gold" },
  { day: 4, hour: 5, span: 1, col: 3, label: "Bruno V.", service: "Clássico", barber: "BV", tone: "muted" },
  { day: 5, hour: 1, span: 1, col: 0, label: "Carlos E.", service: "Degradê", barber: "RC", tone: "gold" },
  { day: 5, hour: 3, span: 1, col: 2, label: "Igor T.", service: "Combo", barber: "GA", tone: "profit" },
  { day: 5, hour: 5, span: 1, col: 1, label: "Marcos V.", service: "Combo", barber: "ML", tone: "info" },
  { day: 6, hour: 1, span: 1, col: 3, label: "—", service: "Fechado", barber: "—", tone: "muted", closed: true },
];

const TONES = {
  gold: "bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]",
  info: "bg-blue-500/15 border-blue-500/40 text-blue-300",
  profit: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
  loss: "bg-rose-500/15 border-rose-500/40 text-rose-300",
  muted: "bg-white/[0.04] border-white/[0.1] text-slate-400",
};

export default function Calendario() {
  return (
    <>
      <PreviewHeader
        title="Calendário Operacional"
        subtitle="Visualize agendamentos por barbeiro em toda a semana. Arraste para reorganizar."
        period="Setembro 2026"
        kpi="5 barbeiros ativos"
        actions={
          <button
            type="button"
            className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5"
            data-testid="calendario-new-block"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Novo bloco
          </button>
        }
      />

      {/* Navegação da semana */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <button type="button" className="h-8 w-8 rounded-[3px] bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 flex items-center justify-center text-slate-300 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="h-8 px-3 text-xs font-bold text-slate-300 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[3px]">Hoje</button>
          <button type="button" className="h-8 w-8 rounded-[3px] bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 flex items-center justify-center text-slate-300 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-bold text-white">21 — 27 de Setembro</span>
        </div>
        <div className="flex items-center gap-1 rounded-[4px] border border-white/10 bg-[#12141F] p-0.5">
          {["Semana", "Dia", "Mês"].map((v, i) => (
            <button
              key={v}
              type="button"
              className={`h-7 px-3 text-xs font-bold rounded-[3px] transition-colors ${
                i === 0 ? "bg-[#D4AF37] text-[#0B0F19]" : "text-slate-400 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Grid semanal */}
      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-3 overflow-x-auto">
        <div className="min-w-[820px]">
          {/* Cabeçalho dias */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1.5 mb-2">
            <div />
            {WEEK.map((d) => (
              <div
                key={d.date}
                className={`rounded-[3px] py-2 text-center ${
                  d.current ? "bg-[#D4AF37]/10 border border-[#D4AF37]/30" : "border border-white/[0.06]"
                }`}
              >
                <p className={`text-[10px] uppercase font-bold tracking-wider ${d.current ? "text-[#D4AF37]" : "text-slate-400"}`}>{d.day}</p>
                <p className={`text-base font-display font-bold ${d.current ? "text-[#D4AF37]" : "text-white"}`}>{d.date}</p>
              </div>
            ))}
          </div>

          {/* Corpo do calendário */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1.5">
            {HOURS.map((h, hi) => (
              <>
                <div key={`h-${h}`} className="text-[10px] font-mono font-bold text-slate-500 pt-1.5">
                  {h}
                </div>
                {WEEK.map((d, di) => {
                  const blocksInCell = BLOCKS.filter((b) => b.day === di && b.hour === hi);
                  return (
                    <div
                      key={`c-${hi}-${di}`}
                      className="min-h-[64px] rounded-[3px] border border-white/[0.05] bg-[#0F121C] p-1 space-y-1"
                    >
                      {blocksInCell.map((b, i) => (
                        <div
                          key={i}
                          className={`rounded-[2px] border px-1.5 py-1 text-[10px] leading-tight ${
                            TONES[b.tone]
                          } ${b.live ? "ring-1 ring-emerald-400/40" : ""} ${b.done ? "opacity-60" : ""}`}
                        >
                          <p className="font-bold truncate">{b.label}</p>
                          <p className="text-[9px] opacity-80 truncate">{b.service} · {b.barber}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="font-bold text-white text-[10px] uppercase tracking-wider">Legenda:</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#D4AF37]" /> Rodrigo Costa</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-blue-400" /> Matheus Lima</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-emerald-400" /> Gabriel Alves</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-slate-500" /> Lucas / Bruno</span>
      </div>
    </>
  );
}