import React from "react";
import {
  ShieldCheck,
  Users,
  Calendar,
  Scissors,
  ChevronRight,
  Plus,
} from "lucide-react";

export default function OperationalStatus({
  barbersCount = 0,
  appointmentsCount = 0,
  inServiceCount = 0,
  statusText = "Ao Vivo",
  onOpenNewAppointment,
  onRowClick,
}) {
  return (
    <div className="rounded-2xl bg-[#0D121B] border border-[#161e2c] p-4 sm:p-5 shadow-xl flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-[#161e2c]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#E5C365]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Situação Agora
            </h3>
          </div>
          {/* Badge Ao Vivo (#20C997) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#20C997]/10 border border-[#20C997]/25 text-[#20C997] text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20C997] animate-pulse" />
            <span>{statusText}</span>
          </div>
        </div>

        {/* Linhas Operacionais (Sem fila: foco em Barbeiros, Agendamentos e Atendimentos em Andamento) */}
        <div className="space-y-1 sm:space-y-1.5 py-1">
          {/* Linha 1: Barbeiros hoje */}
          <div
            onClick={() => onRowClick?.("barbeiros")}
            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-[#111722] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-[#141b27] text-slate-300 group-hover:text-[#E5C365] transition-colors">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                Barbeiros hoje
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white tabular-nums font-mono">
                {barbersCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
            </div>
          </div>

          {/* Linha 2: Agendamentos hoje (Substituindo a fila por agendamento real) */}
          <div
            onClick={() => onRowClick?.("agendamentos")}
            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-[#111722] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-[#141b27] text-slate-300 group-hover:text-[#E5C365] transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                Agendamentos hoje
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white tabular-nums font-mono">
                {appointmentsCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
            </div>
          </div>

          {/* Linha 3: Em atendimento */}
          <div
            onClick={() => onRowClick?.("atendimento")}
            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-[#111722] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-[#141b27] text-slate-300 group-hover:text-[#E5C365] transition-colors">
                <Scissors className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                Em atendimento
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-[#20C997] tabular-nums font-mono">
                {inServiceCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Botão de Destaque Dourado "+ Novo Atendimento" */}
      <div className="pt-3">
        <button
          type="button"
          onClick={onOpenNewAppointment}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-[#D4AF37] via-[#E5C365] to-[#D4AF37] hover:brightness-105 active:scale-[0.99] transition-all shadow-[0_4px_16px_rgba(212,175,55,0.25)] cursor-pointer"
          data-testid="btn-novo-atendimento"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Atendimento</span>
        </button>
      </div>
    </div>
  );
}
