import { Plus, CreditCard } from "lucide-react";
import { PreviewHeader, PB } from "../PreviewShell";

const MACHINES = [
  { name: "Stone - Principal", debit: 1.49, credVista: 2.79, credParcelado: 4.49, anticipation: 1.5, status: "Ativa", pix: 0, used: true },
  { name: "Cielo - Loja 01", debit: 1.39, credVista: 2.69, credParcelado: 4.39, anticipation: 1.5, status: "Ativa", pix: 0, used: true },
  { name: "Mercado Pago", debit: 1.59, credVista: 2.89, credParcelado: 4.59, anticipation: 1.5, status: "Ativa", pix: 0, used: false },
  { name: "PagSeguro", debit: 1.69, credVista: 2.99, credParcelado: 4.69, anticipation: 1.5, status: "Em revisão", pix: 0, used: false },
];

export default function Maquininhas() {
  return (
    <>
      <PreviewHeader
        title="Maquininhas & Taxas"
        subtitle="Cadastre adquirentes e mantenha as taxas atualizadas. Pix é sempre 0%."
        period="Setembro 2026"
        kpi="4 cadastradas"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="maquininhas-new">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Nova maquininha
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {MACHINES.map((m) => (
          <div key={m.name} className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5 hover:border-[#D4AF37]/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-white">{m.name}</p>
                  <PB tone={m.status === "Ativa" ? "profit" : "muted"}>{m.status}</PB>
                </div>
              </div>
              {m.used && <PB tone="gold">Padrão</PB>}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pix</p>
                <p className="text-sm font-display font-bold text-emerald-400 mt-0.5">0%</p>
              </div>
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Débito</p>
                <p className="text-sm font-bold text-white mt-0.5">{m.debit.toFixed(2)}%</p>
              </div>
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">C. Vista</p>
                <p className="text-sm font-bold text-white mt-0.5">{m.credVista.toFixed(2)}%</p>
              </div>
              <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Parcelado</p>
                <p className="text-sm font-bold text-white mt-0.5">{m.credParcelado.toFixed(2)}%</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Antecipação automática</span>
              <span className="text-[10px] font-bold text-white">{m.anticipation.toFixed(2)}% / dia</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}