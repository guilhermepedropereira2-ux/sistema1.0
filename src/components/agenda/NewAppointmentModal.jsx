import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, User, Scissors, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const DEFAULT_TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

export default function NewAppointmentModal({
  open,
  onClose,
  onAddAppointment,
  initialBarberId,
  initialTime,
  initialDate,
  barbers: propBarbers = [],
  services: propServices = [],
}) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [barberId, setBarberId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(() => initialDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(initialTime || "10:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [barbersList, setBarbersList] = useState(propBarbers);
  const [servicesList, setServicesList] = useState(propServices);

  useEffect(() => {
    if (!open) return;

    if (initialTime) setTime(initialTime);
    if (initialDate) setDate(initialDate);
    if (initialBarberId) setBarberId(initialBarberId);

    // Carrega dados da API caso não tenham sido passados
    if (propBarbers.length === 0 || propServices.length === 0) {
      Promise.all([api.get("/barbers"), api.get("/services")])
        .then(([bRes, sRes]) => {
          const activeB = (Array.isArray(bRes) ? bRes : []).filter((b) => b.active !== false);
          const activeS = (Array.isArray(sRes) ? sRes : []).filter((s) => s.active !== false);
          setBarbersList(activeB);
          setServicesList(activeS);

          if (!barberId && activeB.length > 0) {
            setBarberId(initialBarberId || activeB[0].id);
          }
          if (!serviceId && activeS.length > 0) {
            setServiceId(activeS[0].id);
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar catálogo para agendamento:", err);
        });
    } else {
      setBarbersList(propBarbers);
      setServicesList(propServices);
      if (!barberId && propBarbers.length > 0) {
        setBarberId(initialBarberId || propBarbers[0].id);
      }
      if (!serviceId && propServices.length > 0) {
        setServiceId(propServices[0].id);
      }
    }
  }, [open, initialBarberId, initialTime, initialDate, propBarbers, propServices]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error("Por favor, informe o nome do cliente.");
      return;
    }

    const selectedService = servicesList.find((s) => s.id === serviceId) || servicesList[0];
    const selectedBarber = barbersList.find((b) => b.id === barberId) || barbersList[0];

    setSubmitting(true);
    try {
      const createdApt = await api.post("/appointments", {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        barber_id: selectedBarber?.id,
        service_ids: selectedService ? [selectedService.id] : [],
        service_name: selectedService?.name || "Corte Tradicional",
        date: date,
        time: time,
        duration_min: selectedService?.duration_min || 45,
        price: Number(selectedService?.price || 50),
        notes: notes.trim() || undefined,
        status: "confirmado",
      });

      toast.success(`Agendamento de ${clientName} confirmado com ${selectedBarber?.name || "barbeiro"}!`);
      onAddAppointment?.(createdApt);
      onClose();
    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
      toast.error(err?.response?.data?.detail || "Erro ao criar agendamento no servidor.");
    } finally {
      setSubmitting(false);
    }
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
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-['Outfit',sans-serif]">
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
              placeholder="(67) 98888-7777"
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
                {barbersList.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#0A0E15]">
                    {b.name} ({b.role || "Barbeiro"})
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
                {servicesList.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0A0E15]">
                    {s.name} • R$ {Number(s.price || 0).toFixed(2).replace(".", ",")}
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
                {DEFAULT_TIME_SLOTS.map((slot) => (
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
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#070A0F] bg-[#D4AF37] hover:bg-[#E5C365] transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar agendamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
