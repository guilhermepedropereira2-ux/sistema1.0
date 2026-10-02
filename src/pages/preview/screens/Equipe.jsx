import { UserPlus, Calendar, Phone, MoreHorizontal } from "lucide-react";
import { PreviewHeader, PB, Avatar } from "../PreviewShell";
import { BARBERS, BRL } from "../data";

const SCHEDULE = [
  { day: "Seg", ok: true },
  { day: "Ter", ok: true },
  { day: "Qua", ok: true },
  { day: "Qui", ok: true },
  { day: "Sex", ok: true },
  { day: "Sáb", ok: true },
  { day: "Dom", ok: false },
];

export default function Equipe() {
  return (
    <>
      <PreviewHeader
        title="Equipe & Escala de Barbeiros"
        subtitle="Gerencie profissionais, percentuais de comissão e escalas semanais."
        period="Semana 21—27 de Setembro"
        kpi="5 barbeiros"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="equipe-new">
            <UserPlus className="h-3.5 w-3.5 stroke-[3]" />
            Novo barbeiro
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {BARBERS.map((b) => (
          <div key={b.id} className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5 hover:border-[#D4AF37]/30 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <Avatar initials={b.initials} size={11} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-bold text-white truncate">{b.name}</p>
                  <PB tone={b.status === "Ativo" ? "profit" : "muted"}>{b.status}</PB>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{b.role} · {b.commission}% de comissão</p>
              </div>
              <button type="button" className="h-7 w-7 rounded-[3px] bg-[#0F121C] border border-white/10 hover:border-[#D4AF37]/40 flex items-center justify-center text-slate-400">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cortes</p>
                <p className="text-sm font-display font-bold text-white mt-0.5">{b.cuts}</p>
              </div>
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Comissão</p>
                <p className="text-sm font-display font-bold text-[#D4AF37] mt-0.5">{BRL(b.commissionValue)}</p>
              </div>
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Ticket</p>
                <p className="text-sm font-display font-bold text-white mt-0.5">{BRL((b.commissionValue * 100) / b.commission)}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Escala semanal</p>
                <button type="button" className="text-[10px] font-bold text-[#D4AF37] hover:underline flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Editar
                </button>
              </div>
              <div className="flex items-center gap-1">
                {SCHEDULE.map((s) => (
                  <span
                    key={s.day}
                    className={`flex-1 text-center h-7 leading-7 text-[10px] font-bold rounded-[2px] border ${
                      s.ok
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "bg-white/[0.04] border-white/[0.08] text-slate-500"
                    }`}
                  >
                    {s.day}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}