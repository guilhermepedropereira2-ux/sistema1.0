import { Plus, Edit2, Star } from "lucide-react";
import { PreviewHeader, PB } from "../PreviewShell";
import { SERVICES, BRL } from "../data";

export default function Servicos() {
  return (
    <>
      <PreviewHeader
        title="Catálogo de Serviços"
        subtitle="Configure os serviços oferecidos, tempo médio e valor. Itens inativos não aparecem no balcão."
        period="Set serviços ativos"
        kpi="8 itens"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="servicos-new">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Novo serviço
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SERVICES.map((s) => (
          <div
            key={s.id}
            className={`rounded-[4px] border p-4 transition-colors hover:border-[#D4AF37]/40 ${
              s.featured ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.04]" : "border-white/[0.08] bg-[#131622]"
            } ${!s.active ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {s.featured && <Star className="h-3 w-3 text-[#D4AF37] fill-current" />}
                  <p className="font-display text-sm font-bold text-white truncate">{s.name}</p>
                </div>
                <PB tone="muted">{s.category}</PB>
              </div>
              <button type="button" className="h-7 w-7 rounded-[3px] bg-[#0F121C] border border-white/10 hover:border-[#D4AF37]/40 flex items-center justify-center text-slate-400 hover:text-[#D4AF37]">
                <Edit2 className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Duração</p>
                <p className="text-sm font-bold text-white mt-0.5">{s.duration} min</p>
              </div>
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Preço</p>
                <p className="text-sm font-display font-bold text-[#D4AF37] mt-0.5">{BRL(s.price)}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Status</span>
              <PB tone={s.active ? "profit" : "muted"}>{s.active ? "Ativo" : "Inativo"}</PB>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}