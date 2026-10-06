import React from "react";
import ClientAvatar from "@/components/ClientAvatar";
import { Scissors, Clock, MoreVertical, ExternalLink } from "lucide-react";

export default function AppointmentCard({
  appointment,
  onClick,
  style,
  compact = false,
}) {
  const {
    clientName,
    clientAvatar,
    serviceName,
    startTime,
    endTime,
    status,
    durationMinutes = 60,
  } = appointment;

  // Cores de status rigorosamente fiéis à identidade KUPOLA 2.0
  const getStatusBadge = () => {
    switch (status) {
      case "confirmado":
        return (
          <span className="inline-flex items-center text-[10px] font-semibold text-[#20C997] bg-[#20C997]/15 border border-[#20C997]/30 px-2 py-0.5 rounded-md">
            Confirmado
          </span>
        );
      case "pendente":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E5C365] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5C365]" />
            Pendente
          </span>
        );
      case "cancelado":
        return (
          <span className="inline-flex items-center text-[10px] font-semibold text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded-md">
            Cancelado
          </span>
        );
      case "em_atendimento":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E5C365] bg-[#E5C365]/20 border border-[#E5C365]/40 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5C365] animate-pulse" />
            Em atendimento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-md">
            {status}
          </span>
        );
    }
  };

  const getServiceColor = () => {
    const s = (serviceName || "").toLowerCase();
    if (s.includes("corte")) return "text-[#20C997]";
    if (s.includes("barba")) return "text-[#38BDF8]";
    return "text-slate-300";
  };

  return (
    <div
      onClick={() => onClick?.(appointment)}
      style={style}
      className={`group relative rounded-xl sm:rounded-2xl bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/50 p-2.5 sm:p-3 transition-all duration-150 cursor-pointer shadow-md hover:shadow-xl hover:translate-y-[-1px] flex flex-col justify-between overflow-hidden select-none ${
        status === "cancelado" ? "opacity-75" : ""
      }`}
      data-testid={`appointment-card-${appointment.id}`}
    >
      {/* Linha Superior: Horário + Ação rápida */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
          {startTime}-{endTime}
        </span>
        <button
          type="button"
          className="text-slate-500 hover:text-[#E5C365] p-0.5 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(appointment);
          }}
          title="Ver detalhes"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Meio: Avatar e Nome do Cliente + Serviço */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 my-auto">
        <ClientAvatar
          name={clientName}
          photo={clientAvatar}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#E5C365] truncate transition-colors leading-tight">
            {clientName}
          </h4>
          <p className={`text-[11px] sm:text-xs truncate font-medium ${getServiceColor()} leading-tight mt-0.5`}>
            {serviceName}
          </p>
        </div>
      </div>

      {/* Linha Inferior: Badge de Status */}
      <div className="flex items-center justify-end mt-1.5 pt-0.5">
        {getStatusBadge()}
      </div>
    </div>
  );
}
