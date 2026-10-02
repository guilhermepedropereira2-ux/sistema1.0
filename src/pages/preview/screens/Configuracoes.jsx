import { Save } from "lucide-react";
import { PreviewHeader, PB } from "../PreviewShell";

const SECTIONS = [
  {
    title: "Horário de Funcionamento",
    desc: "Defina os horários em que a barbearia aceita agendamentos no link público.",
    fields: [
      { label: "Abertura", value: "09:00" },
      { label: "Fechamento", value: "20:00" },
      { label: "Intervalo entre cortes", value: "15 min" },
    ],
  },
  {
    title: "Mensagens Automáticas",
    desc: "Personalize as mensagens enviadas via WhatsApp para clientes.",
    fields: [
      { label: "Confirmação", value: "Olá, {cliente}. Seu agendamento está confirmado para {data}." },
      { label: "Lembrete (24h antes)", value: "Oi, {cliente}! Lembrando do seu horário amanhã às {hora}." },
    ],
  },
  {
    title: "Política de Cancelamento",
    desc: "Defina regras para cancelamentos e tolerância de atrasos.",
    fields: [
      { label: "Antecedência mínima", value: "4 horas" },
      { label: "Tolerância de atraso", value: "10 minutos" },
    ],
  },
];

export default function Configuracoes() {
  return (
    <>
      <PreviewHeader
        title="Configurações Operacionais"
        subtitle="Preferências de funcionamento, mensagens automáticas e regras de negócio da barbearia."
        kpi="Salvo automaticamente"
        actions={
          <button type="button" className="h-9 px-3 text-xs font-bold text-[#0B0F19] bg-[#D4AF37] hover:bg-[#C59F2E] rounded-[4px] uppercase tracking-wider flex items-center gap-1.5" data-testid="config-save">
            <Save className="h-3.5 w-3.5 stroke-[3]" />
            Salvar tudo
          </button>
        }
      />

      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <div key={s.title} className="rounded-[4px] border border-white/[0.08] bg-[#131622] p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
              <div>
                <p className="text-sm font-display font-bold text-white">{s.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
              </div>
              <PB tone="muted">Padrão</PB>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {s.fields.map((f) => (
                <div key={f.label}>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{f.label}</label>
                  <div className="mt-1.5 rounded-[3px] bg-[#0F121C] border border-white/10 px-3 py-2.5 text-sm text-white">
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}