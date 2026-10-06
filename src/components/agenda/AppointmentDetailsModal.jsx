import React from "react";
import ClientAvatar from "@/components/ClientAvatar";
import {
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  DollarSign,
  Play,
  RotateCcw,
  Edit,
  Trash2,
  FileText,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { BARBERS } from "@/data/agendaData";

export default function AppointmentDetailsModal({
  appointment,
  open,
  onClose,
  onStatusUpdate,
}) {
  if (!open || !appointment) return null;

  const barber = BARBERS.find((b) => b.id === appointment.barberId);

  const handleStartAttendance = () => {
    onStatusUpdate?.(appointment.id, "em_atendimento");
    toast.success(`Atendimento de ${appointment.clientName} iniciado com sucesso!`);
    onClose();
  };

  const handleCancelAppointment = () => {
    onStatusUpdate?.(appointment.id, "cancelado");
    toast.info(`Agendamento de ${appointment.clientName} foi cancelado.`);
    onClose();
  };

  const handleReschedule = () => {
    toast.info("Reagendamento: Selecione um novo horário na grade.");
    onClose();
  };

  const handleEdit = () => {
    toast.info("Modo de edição do agendamento aberto.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0A0E15] border border-[#161E2C] p-5 sm:p-6 shadow-2xl text-white select-none animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Topo */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#161E2C] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365]">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Detalhes do Agendamento
              </h2>
              <p className="text-xs text-slate-400">
                Informações completas do cliente e serviço
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações Principais */}
        <div className="space-y-4">
          {/* Card do Cliente & Barbeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cliente */}
            <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Cliente
              </span>
              <div className="flex items-center gap-2.5">
                <ClientAvatar
                  name={appointment.clientName}
                  photo={appointment.clientAvatar}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">
                    {appointment.clientName}
                  </h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-[#20C997]" />
                    <span>{appointment.clientPhone || "(11) 98888-7777"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Barbeiro */}
            <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Profissional
              </span>
              <div className="flex items-center gap-2.5">
                <img
                  src={barber?.avatar}
                  alt={barber?.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/30"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[#E5C365] truncate">
                    {barber?.name}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {barber?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Serviço & Horário & Valor */}
          <div className="p-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Serviço Agendado</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {appointment.serviceName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Valor</span>
                <span className="text-sm font-black text-[#E5C365] block mt-0.5">
                  R$ {Number(appointment.price || 65).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="h-px bg-white/[0.06] my-1" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Horário</span>
                <span className="font-semibold text-white mt-0.5 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {appointment.startTime} às {appointment.endTime}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Duração</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {appointment.durationMinutes || 60} minutos
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <span className="font-bold text-[#20C997] capitalize mt-0.5 block">
                  {appointment.status}
                </span>
              </div>
            </div>

            {appointment.notes && (
              <div className="pt-2 border-t border-white/[0.06]">
                <span className="text-slate-400 block text-[11px]">Observações</span>
                <p className="text-xs text-slate-300 mt-1 italic bg-[#070A0F] p-2 rounded-lg">
                  "{appointment.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Botões de Ação Fiel ao Gabarito */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCancelAppointment}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancelar agendamento</span>
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleReschedule}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reagendar</span>
              </button>

              <button
                type="button"
                onClick={handleStartAttendance}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#070A0F] bg-[#D4AF37] hover:bg-[#E5C365] transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-[#070A0F]" />
                <span>Iniciar atendimento</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
