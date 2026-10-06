import React, { useState } from "react";
import { X, Calendar, Clock, User, Scissors, Check } from "lucide-react";
import { toast } from "sonner";
import { BARBERS, SERVICES, TIME_SLOTS } from "@/data/agendaData";

export default function NewAppointmentModal({
  open,
  onClose,
  onAddAppointment,
  initialBarberId,
  initialTime,
}) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [barberId, setBarberId] = useState(initialBarberId || BARBERS[0]?.id);
  const [serviceId, setServiceId] = useState(SERVICES[0]?.id);
  const [date, setDate] = useState("2026-10-06");
  const [time, setTime] = useState(initialTime || "10:00");
  const [notes, setNotes] = useState("");

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error("Por favor, informe o nome do cliente.");
      return;
    }

    const selectedService = SERVICES.find((s) => s.id === serviceId);
    const selectedBarber = BARBERS.find((b) => b.id === barberId);

    // Calcular horário de término
    const [h, m] = time.split(":").map(Number);
    const endMinutes = h * 60 + m + (selectedService?.duration || 60);
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const endTime = `${endH}:${endM}`;

    const newApt = {
      id: `apt-${Date.now()}`,
      barberId: barberId || BARBERS[0].id,
      clientName: clientName.trim(),
      clientPhone: clientPhone || "(11) 99999-0000",
      clientAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      serviceName: selectedService?.name || "Corte Masculino",
      startTime: time,
      endTime,
      durationMinutes: selectedService?.duration || 60,
      status: "confirmado",
      price: selectedService?.price || 65.0,
      notes: notes.trim(),
    };

    onAddAppointment?.(newApt);
    toast.success(`Agendamento de ${clientName} confirmado com ${selectedBarber?.name}!`);
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
        {/* Topo do Modal */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#161E2C] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Novo Agendamento
              </h2>
              <p className="text-xs text-slate-400">
                Preencha os detalhes para agendar o atendimento
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome do Cliente *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Rodrigo Mendonça"
                className="w-full h-10 px-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              WhatsApp / Telefone
            </label>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(11) 98888-7777"
              className="w-full h-10 px-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white placeholder-slate-500"
            />
          </div>

          {/* Barbeiro & Serviço em 2 Colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Barbeiro *
              </label>
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white cursor-pointer"
              >
                {BARBERS.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#0A0E15]">
                    {b.name} ({b.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Serviço *
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white cursor-pointer"
              >
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0A0E15]">
                    {s.name} • R$ {s.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data & Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Horário *
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white cursor-pointer"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot} className="bg-[#0A0E15]">
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Preferência por toalha quente, lavagem especial..."
              className="w-full p-2.5 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white placeholder-slate-500 resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#161E2C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#070A0F] bg-[#D4AF37] hover:bg-[#E5C365] transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar agendamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
