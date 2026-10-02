import { ArrowRightLeft, CheckCircle2, AlertCircle, Banknote } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { BRL } from "../data";

const CLOSING_ITEMS = [
  { label: "Atendimentos do dia", value: "28", status: "ok" },
  { label: "Receita bruta", value: BRL(1240), status: "ok" },
  { label: "Taxas descontadas", value: BRL(-37.2), status: "ok" },
  { label: "Receita líquida", value: BRL(1202.8), status: "ok" },
  { label: "Comissões (somatório)", value: BRL(572.4), status: "ok" },
  { label: "Despesas operacionais", value: BRL(0), status: "ok" },
  { label: "Quebra de caixa", value: "R$ 0,00", status: "ok" },
  { label: "Conferência de comandas", value: "27/28", status: "warn" },
];

export default function Fechamento() {
  return (
    <>
      <PreviewHeader
        title="Fechamento de Caixa"
        subtitle="Checklist operacional para encerrar o dia. Após validar, o DRE do dia é consolidado."
        period="Quarta, 23 de Setembro"
        kpi="Pendente de fechamento"
        actions={
          <button type="button" className="h-9 px-4 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="fechamento-confirm">
            <ArrowRightLeft className="h-3.5 w-3.5 stroke-[3]" />
            Confirmar fechamento
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Caixa Esperado" value={BRL(1202.8)} accent="gold" note="Soma líquida" />
        <KpiCard label="Contado em Caixa" value={BRL(1202.8)} accent="white" note="Informado pelo caixa" />
        <KpiCard label="Diferença" value="R$ 0,00" accent="profit" note="Sem quebra" />
        <KpiCard label="Movimentações" value="28" accent="muted" note="Atendimentos" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                <Banknote className="h-3.5 w-3.5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Checklist do dia</p>
                <p className="text-xs text-slate-400 mt-0.5">Valide cada item antes de fechar o caixa</p>
              </div>
            </div>
            <PB tone="gold">7 / 8 OK</PB>
          </div>
          <div className="space-y-1">
            {CLOSING_ITEMS.map((it, i) => (
              <div key={i} className="flex items-center justify-between rounded-[3px] px-3 py-2.5 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  {it.status === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="text-xs text-slate-200">{it.label}</span>
                </div>
                <span className="text-xs font-mono font-bold text-white">{it.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80 mb-4">Por forma de pagamento</p>
          <div className="space-y-3">
            {[
              { name: "PIX", value: 480, pct: 40, tone: "bg-emerald-400" },
              { name: "Crédito à vista", value: 380, pct: 31, tone: "bg-blue-400" },
              { name: "Débito", value: 220, pct: 18, tone: "bg-amber-400" },
              { name: "Dinheiro", value: 160, pct: 13, tone: "bg-[#D4AF37]" },
            ].map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">{p.name}</span>
                  <span className="font-mono font-bold text-white">{BRL(p.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className={`h-full ${p.tone}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observações do caixa</p>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Um cliente aguardou sem comanda registrada. Verificar com Rodrigo Costa antes de fechar.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}