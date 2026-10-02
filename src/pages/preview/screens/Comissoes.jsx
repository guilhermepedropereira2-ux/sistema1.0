import { Send, Download, CheckCircle2 } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { COMMISSION_TABLE, BARBERS, BRL } from "../data";

export default function Comissoes() {
  const totalBruto = COMMISSION_TABLE.reduce((acc, r) => acc + r.gross, 0);
  const totalComissao = COMMISSION_TABLE.reduce((acc, r) => acc + r.commValue, 0);
  const totalLiquido = COMMISSION_TABLE.reduce((acc, r) => acc + r.net, 0);

  return (
    <>
      <PreviewHeader
        title="Comissões dos Barbeiros"
        subtitle="Cálculo automático por percentual e valor. Pronto para disparar Pix em lote."
        period="Setembro 2026"
        kpi="Cálculo automático"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="comissoes-pix-lote">
            <Send className="h-3.5 w-3.5 stroke-[3]" />
            Disparar Pix em lote
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <KpiCard label="Bruto Atendido" value={BRL(totalBruto)} accent="white" />
        <KpiCard label="Total Comissões" value={BRL(totalComissao)} accent="gold" note="Cálculo automático" />
        <KpiCard label="Taxas Descontadas" value={BRL(-845)} accent="loss" note="Já na fonte" />
        <KpiCard label="Líquido para Pix" value={BRL(totalLiquido)} accent="profit" note="5 barbeiros" />
      </div>

      <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5 mb-6">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Detalhamento por barbeiro</p>
            <p className="text-xs text-slate-400 mt-0.5">Comissão configurada por profissional · atualizada em tempo real</p>
          </div>
          <button type="button" className="h-8 px-3 text-xs font-bold text-slate-200 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[3px] flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
            PDF / Pix
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Barbeiro</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Cortes</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Bruto</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Comissão</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Taxa</th>
              <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Líquido Pix</th>
              <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {COMMISSION_TABLE.map((r, i) => {
              const b = BARBERS[i];
              return (
                <tr key={r.barber} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-[10px]">
                        {b?.initials || "—"}
                      </span>
                      <span className="font-semibold text-white">{r.barber}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold text-white">{r.cuts}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-300 hidden md:table-cell">{BRL(r.gross)}</td>
                  <td className="px-2 py-2.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[44px] h-6 px-2 rounded-[2px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-bold">
                      {r.commPct}%
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-rose-300 hidden md:table-cell">{BRL(-r.fees)}</td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold text-emerald-400">{BRL(r.net)}</td>
                  <td className="px-2 py-2.5 text-center">
                    {b?.pixReady ? (
                      <PB tone="profit"><CheckCircle2 className="h-3 w-3" /> Pronto</PB>
                    ) : (
                      <PB tone="muted">Aguardando</PB>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#D4AF37]/30 bg-[#D4AF37]/[0.04]">
              <td className="px-2 py-3 text-[10px] uppercase font-bold tracking-wider text-[#D4AF37]">Total</td>
              <td className="px-2 py-3 text-right font-mono font-bold text-white">512</td>
              <td className="px-2 py-3 text-right font-mono font-bold text-white hidden md:table-cell">{BRL(totalBruto)}</td>
              <td className="px-2 py-3 text-center font-bold text-[#D4AF37]">—</td>
              <td className="px-2 py-3 text-right font-mono font-bold text-rose-300 hidden md:table-cell">{BRL(-845)}</td>
              <td className="px-2 py-3 text-right font-mono font-bold text-emerald-400">{BRL(totalLiquido)}</td>
              <td className="px-2 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rounded-[4px] border border-[#D4AF37]/30 bg-[#D4AF37]/[0.04] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Pronto para envio</p>
          <p className="text-base font-display font-bold text-white mt-0.5">5 comissões validadas no valor total de {BRL(totalLiquido)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="h-9 px-4 text-xs font-bold text-slate-300 bg-[#131622] border border-white/10 hover:border-[#D4AF37]/40 rounded-[4px] uppercase tracking-wider">
            Revisar
          </button>
          <button type="button" className="h-9 px-4 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="comissoes-confirm-pix">
            <Send className="h-3.5 w-3.5 stroke-[3]" />
            Confirmar e disparar Pix
          </button>
        </div>
      </div>
    </>
  );
}