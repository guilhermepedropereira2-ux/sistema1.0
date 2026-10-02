import { Activity, Filter } from "lucide-react";
import { PreviewHeader, PB } from "../PreviewShell";
import { HISTORY } from "../data";

export default function Historico() {
  return (
    <>
      <PreviewHeader
        title="Histórico / Logs"
        subtitle="Auditoria completa: quem fez o quê, quando e em qual valor. Rastreabilidade total."
        period="Hoje, 23 de Setembro"
        kpi="142 eventos no dia"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-slate-200 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[4px] flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#D4AF37]" />
            Filtrar
          </button>
        }
      />

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
          <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-[#D4AF37]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Linha do tempo</p>
        </div>
        <div className="relative">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.08]" />
          <div className="space-y-3">
            {HISTORY.map((h, i) => (
              <div key={i} className="relative pl-8">
                <div className="absolute left-[7px] top-1.5 h-2 w-2 rounded-full bg-[#D4AF37] border-2 border-[#131622]" />
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-[#D4AF37]">{h.time}</span>
                  <span className="text-xs font-semibold text-white">{h.user}</span>
                  <span className="text-xs text-slate-300 truncate">{h.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}