import { Plus } from "lucide-react";
import { PreviewHeader, PB } from "../PreviewShell";
import { CATEGORIES } from "../data";

export default function Categorias() {
  return (
    <>
      <PreviewHeader
        title="Categorias"
        subtitle="Organize serviços, produtos e despesas em agrupamentos personalizáveis com cor própria."
        period="6 categorias ativas"
        kpi="Catálogo organizado"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="categorias-new">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Nova categoria
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORIES.map((c) => (
          <div key={c.id} className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5 hover:border-[#D4AF37]/30">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-[4px] flex items-center justify-center font-display text-base font-bold text-[#0B0F19]"
                style={{ background: c.color }}
              >
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-bold text-white truncate">{c.name}</p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
                  {c.count} itens vinculados
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <PB tone="muted">#categoria/{c.name.toLowerCase()}</PB>
              <button type="button" className="text-[10px] font-bold text-[#D4AF37] hover:underline">Editar</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}