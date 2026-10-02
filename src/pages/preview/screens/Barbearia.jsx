import { Store, Copy, ExternalLink } from "lucide-react";
import { PreviewHeader, KpiCard, PB } from "../PreviewShell";
import { SHOP } from "../data";

export default function Barbearia() {
  return (
    <>
      <PreviewHeader
        title="Cadastro da Barbearia"
        subtitle="Informações da unidade matriz, dados de contato e link público para agendamentos."
        period="Atualizado em 12/09/2026"
        kpi={SHOP.plan}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cartão principal */}
        <div className="lg:col-span-2 rounded-[4px] border border-[#D4AF37]/30 bg-gradient-to-br from-[#131622] to-[#0F121C] p-6 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-40 w-40 bg-[#D4AF37]/10 rounded-full blur-2xl" />
          <div className="flex items-start gap-4 relative">
            <div className="h-16 w-16 rounded-[4px] bg-gradient-to-br from-[#EAB308] to-[#D4AF37] flex items-center justify-center text-[#0B0F19] font-black text-2xl border border-[#D4AF37]/50">
              {SHOP.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-xl font-bold text-white">{SHOP.name}</h2>
                <PB tone="gold">{SHOP.plan}</PB>
              </div>
              <p className="text-sm text-slate-400">{SHOP.unit} · {SHOP.city}</p>
              <p className="text-xs text-slate-500 mt-2">CNPJ: 12.345.678/0001-90 · Aberta desde 2018</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 relative">
            <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.08] p-3">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cadeiras</p>
              <p className="text-lg font-display font-bold text-white mt-1">5 ativas</p>
            </div>
            <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.08] p-3">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Funcionários</p>
              <p className="text-lg font-display font-bold text-white mt-1">7 pessoas</p>
            </div>
            <div className="rounded-[3px] bg-[#0F121C] border border-white/[0.08] p-3">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Trial</p>
              <p className="text-lg font-display font-bold text-[#D4AF37] mt-1">{SHOP.trial}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[3px] bg-[#0F121C] border border-white/[0.08] p-3 flex items-center justify-between relative">
            <div className="flex items-center gap-2 min-w-0">
              <ExternalLink className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
              <code className="text-xs text-slate-300 truncate font-mono">
                kupola.app/agendar/{SHOP.slug}
              </code>
            </div>
            <button type="button" className="h-7 px-2 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-[3px] flex items-center gap-1" data-testid="barbearia-copy-link">
              <Copy className="h-3 w-3" />
              Copiar
            </button>
          </div>
        </div>

        {/* Status lateral */}
        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Store className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Status</p>
          </div>
          <div className="space-y-2">
            {[
              { label: "Plano", value: SHOP.plan, tone: "gold" },
              { label: "Backup", value: "Hoje, 03:00", tone: "profit" },
              { label: "Sincronização", value: "Em dia", tone: "profit" },
              { label: "Integrações", value: "1 ativa", tone: "info" },
              { label: "Domínio personalizado", value: "Não configurado", tone: "muted" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-[3px] px-3 py-2.5 hover:bg-white/[0.03]">
                <span className="text-xs text-slate-300">{s.label}</span>
                <PB tone={s.tone}>{s.value}</PB>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário */}
        <div className="lg:col-span-3 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80 mb-4">Dados de contato</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Nome fantasia", value: "Barbearia Vintage Club" },
              { label: "Razão social", value: "Vintage LTDA" },
              { label: "Telefone principal", value: "(11) 4002-8922" },
              { label: "WhatsApp", value: "(11) 99812-7766" },
              { label: "E-mail", value: "contato@vintagebarbearia.com" },
              { label: "Endereço", value: "Rua Augusta, 1234 — São Paulo / SP" },
              { label: "Horário", value: "Seg-Sáb 09:00-20:00" },
              { label: "Responsável", value: SHOP.owner },
              { label: "Slug público", value: SHOP.slug },
            ].map((f) => (
              <div key={f.label} className="rounded-[3px] bg-[#0F121C] border border-white/[0.08] p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{f.label}</p>
                <p className="text-sm font-semibold text-white mt-1 truncate">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}