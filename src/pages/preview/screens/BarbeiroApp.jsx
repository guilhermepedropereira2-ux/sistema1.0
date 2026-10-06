import { Scissors, Plus, Home, Calendar, Users, BarChart3, User, Send, Camera } from "lucide-react";
import { PreviewHeader, PB, Avatar } from "../PreviewShell";
import { BRL } from "../data";

// Painel do barbeiro em formato mobile-first (estilo app).
export default function BarbeiroApp() {
  const barbearia = { initials: "RC", name: "Rodrigo Costa" };

  return (
    <>
      <PreviewHeader
        title="Portal do Barbeiro (Mobile)"
        subtitle="Versão mobile-first para o barbeiro lançar atendimentos e acompanhar sua performance em tempo real."
        kpi="App do barbeiro"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mockup de celular */}
        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="mx-auto max-w-[340px] rounded-[36px] border-[10px] border-[#0B0D14] bg-[#0F121C] overflow-hidden shadow-2xl">
            {/* Status bar */}
            <div className="bg-[#0B0D14] px-5 py-1.5 flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>09:42</span>
              <div className="flex items-center gap-1">
                <span>●●●</span>
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* App header */}
            <div className="bg-gradient-to-br from-[#1A1F2E] to-[#0F121C] px-4 pt-3 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Avatar initials={barbearia.initials} size={9} />
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">Olá, Rodrigo</p>
                    <p className="text-[9px] text-slate-400 leading-tight">Bom dia 👋</p>
                  </div>
                </div>
                <div className="h-7 w-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Scissors className="h-3.5 w-3.5 text-[#D4AF37]" />
                </div>
              </div>
              <div className="rounded-[10px] bg-[#D4AF37] p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#0B0F19] opacity-70">Comissão de hoje</p>
                <p className="font-display text-2xl font-bold text-[#0B0F19] mt-0.5">{BRL(412.50)}</p>
                <p className="text-[9px] font-semibold text-[#0B0F19] opacity-80 mt-0.5">8 cortes · ticket R$ 52</p>
              </div>
            </div>

            {/* Conteúdo scroll */}
            <div className="bg-[#0F121C] p-3 space-y-2">
              <div className="rounded-[10px] bg-[#131622] border border-white/[0.06] p-3">
                <p className="text-[9px] uppercase font-bold tracking-wider text-[#D4AF37] mb-2">Em atendimento agora</p>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">MV</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">Marcos Vinícius</p>
                    <p className="text-[10px] text-slate-400 truncate">Combo Cabelo + Barba · 35 min</p>
                  </div>
                  <PB tone="gold"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ao vivo</PB>
                </div>
              </div>

              <div className="rounded-[10px] bg-[#131622] border border-white/[0.06] p-3">
                <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-2">Próximo da fila</p>
                <div className="space-y-1.5">
                  {[
                    { name: "Felipe Tavares", service: "Barba Terapia", time: "10:05" },
                    { name: "André Lima", service: "Corte Clássico", time: "10:30" },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{c.name}</p>
                        <p className="text-[9px] text-slate-400">{c.service}</p>
                      </div>
                      <span className="font-mono font-bold text-[#D4AF37]">{c.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="w-full h-12 rounded-[10px] bg-[#D4AF37] text-[#0B0F19] font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                data-testid="barbeiro-app-lancar"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                Lançar atendimento
              </button>
            </div>

            {/* Bottom nav mobile */}
            <div className="bg-[#0B0D14] border-t border-white/[0.08] px-2 py-2 flex items-center justify-around">
              {[
                { icon: Home, label: "Início", active: true },
                { icon: Calendar, label: "Agenda", active: false },
                { icon: Plus, label: "Lançar", accent: true },
                { icon: BarChart3, label: "Desempenho", active: false },
                { icon: User, label: "Perfil", active: false },
              ].map((t) => {
                const Icon = t.icon;
                if (t.accent) {
                  return (
                    <div key={t.label} className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-[#D4AF37] flex items-center justify-center -mt-3">
                        <Icon className="h-5 w-5 text-[#0B0F19] stroke-[3]" />
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={t.label} className={`flex flex-col items-center gap-0.5 ${t.active ? "text-[#D4AF37]" : "text-slate-500"}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-[9px] font-bold">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recursos da versão */}
        <div className="space-y-3">
          <div className="rounded-[4px] border border-[#D4AF37]/30 bg-gradient-to-br from-[#131622] to-[#0F121C] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-[4px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Scissors className="h-4 w-4" />
              </div>
              <p className="text-sm font-display font-bold text-white">Recursos Mobile-First</p>
            </div>
            <ul className="space-y-2.5">
              {[
                { t: "Lançar atendimento em 3 toques", d: "Cliente, serviço, forma de pagamento. Pronto." },
                { t: "Comissão em tempo real", d: "Acompanhe quanto vai receber a cada corte." },
                { t: "Fila ao vivo", d: "Veja quem é o próximo e o tempo médio de espera." },
                { t: "Agenda pessoal", d: "Seus agendamentos do dia, sincronizados." },
                { t: "Histórico mensal", d: "Comissões já pagas e previsão de pagamento." },
              ].map((r) => (
                <li key={r.t} className="flex items-start gap-3 rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-3">
                  <div className="h-6 w-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5">
                    <span className="text-[10px] font-black">✓</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{r.t}</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{r.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80 mb-3">Métricas (Rodrigo · Setembro)</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Atendimentos", v: "154" },
                { l: "Comissão", v: BRL(4314) },
                { l: "Pix enviado", v: "Hoje" },
              ].map((m) => (
                <div key={m.l} className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-2.5 text-center">
                  <p className="text-[10px] text-slate-400">{m.l}</p>
                  <p className="text-xs font-display font-bold text-[#D4AF37] mt-0.5">{m.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}