import React from "react";
import ClientAvatar from "@/components/ClientAvatar";
import { ArrowRight } from "lucide-react";

export default function UpcomingAppointments({
  appointments = [],
  onSelectAppointment,
  onViewAll,
}) {
  const getBadge = (status) => {
    if (status === "confirmado") {
      return (
        <span className="text-[10px] font-semibold text-[#20C997] bg-[#20C997]/15 border border-[#20C997]/30 px-2 py-0.5 rounded-md">
          Confirmado
        </span>
      );
    }
    if (status === "pendente") {
      return (
        <span className="text-[10px] font-semibold text-[#E5C365] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">
          Pendente
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-md">
        {status}
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-[#0A0E15] border border-[#161E2C] p-4 sm:p-5 shadow-xl select-none">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Próximos agendamentos
        </h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-[#E5C365] hover:text-white flex items-center gap-1 transition-colors cursor-pointer group"
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Lista Vertical Compacta Fiel ao Gabarito */}
      <div className="space-y-2">
        {appointments.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectAppointment?.(item)}
            className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#0D121B] hover:bg-[#121824] border border-[#161E2C] hover:border-[#D4AF37]/40 transition-all cursor-pointer group"
          >
            {/* Horário */}
            <span className="text-xs font-bold text-slate-300 group-hover:text-white w-11 shrink-0">
              {item.time}
            </span>

            {/* Avatar + Cliente + Serviço */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <ClientAvatar
                name={item.clientName}
                photo={item.avatar}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white group-hover:text-[#E5C365] truncate leading-tight">
                  {item.clientName}
                </h4>
                <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                  {item.serviceName}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">{getBadge(item.status)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
