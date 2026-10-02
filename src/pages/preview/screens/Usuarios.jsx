import { Plus, ShieldCheck } from "lucide-react";
import { PreviewHeader, PB, Avatar } from "../PreviewShell";
import { USERS } from "../data";

const ROLE_TONE = {
  Dono: "gold",
  Gerente: "info",
  Caixa: "profit",
  Barbeiro: "muted",
};

export default function Usuarios() {
  return (
    <>
      <PreviewHeader
        title="Usuários & Acessos"
        subtitle="Controle de acessos por papel. Apenas o dono pode visualizar e gerenciar usuários."
        period="5 contas cadastradas"
        kpi="Permissões granulares"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="usuarios-new">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            Convidar usuário
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Contas ativas</p>
            <PB tone="muted">{USERS.length}</PB>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Usuário</th>
                <th className="text-left text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">E-mail</th>
                <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Papel</th>
                <th className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2">Status</th>
                <th className="text-right text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-2 hidden md:table-cell">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar initials={u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")} size={7} />
                      <span className="font-semibold text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-slate-400 hidden md:table-cell">{u.email}</td>
                  <td className="px-2 py-2.5 text-center"><PB tone={ROLE_TONE[u.role]}>{u.role}</PB></td>
                  <td className="px-2 py-2.5 text-center"><PB tone={u.status === "Ativo" ? "profit" : "loss"}>{u.status}</PB></td>
                  <td className="px-2 py-2.5 text-right text-slate-400 hidden md:table-cell">{u.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-[3px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/80">Permissões por papel</p>
          </div>
          <div className="space-y-3">
            {[
              { role: "Dono", desc: "Acesso total. Pode excluir a barbearia.", color: "gold" },
              { role: "Gerente", desc: "Ver financeiro, gerenciar equipe.", color: "info" },
              { role: "Caixa", desc: "Lançar pagamentos e fechar caixa.", color: "profit" },
              { role: "Barbeiro", desc: "Lançar atendimentos e ver comissão.", color: "muted" },
            ].map((r) => (
              <div key={r.role} className="rounded-[3px] bg-[#0F121C] border border-white/[0.06] p-3">
                <PB tone={r.color}>{r.role}</PB>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}