import React, { useState, useMemo, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import AgendaToolbar from "@/components/agenda/AgendaToolbar";
import CalendarGrid from "@/components/agenda/CalendarGrid";
import MiniCalendar from "@/components/agenda/MiniCalendar";
import DailySummary from "@/components/agenda/DailySummary";
import UpcomingAppointments from "@/components/agenda/UpcomingAppointments";
import NewAppointmentModal from "@/components/agenda/NewAppointmentModal";
import AppointmentDetailsModal from "@/components/agenda/AppointmentDetailsModal";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";

export default function Calendario() {
  const [refreshTick, setRefreshTick] = useState(0);

  // Busca dados reais do Backend Central
  const { data: rawAppointments, loading: loadingApts, reload: reloadApts } = useApi(
    (apiClient) => apiClient.get("/appointments"),
    [refreshTick]
  );
  const { data: rawBarbers, loading: loadingBarbers } = useApi(
    (apiClient) => apiClient.get("/barbers"),
    [refreshTick]
  );
  const { data: rawServices } = useApi(
    (apiClient) => apiClient.get("/services"),
    [refreshTick]
  );
  const { data: rawClients } = useApi(
    (apiClient) => apiClient.get("/clients"),
    [refreshTick]
  );

  const [viewMode, setViewMode] = useState("dia");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedBarberId, setSelectedBarberId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newSlotData, setNewSlotData] = useState({ barberId: null, time: null });

  // Lista de barbeiros normalizada para o componente visual da grade
  const barbers = useMemo(() => {
    if (!Array.isArray(rawBarbers)) return [];
    return rawBarbers
      .filter((b) => b.active !== false)
      .map((b) => ({
        id: b.id,
        name: b.name?.split(" ")[0] || b.name,
        fullName: b.name,
        role: b.role || "Barbeiro",
        avatar: b.avatar || "",
        active: b.active !== false,
        phone: b.phone || "",
        specialty: b.specialty || "Corte Masculino & Barba",
      }));
  }, [rawBarbers]);

  // Lista de serviços
  const services = useMemo(() => {
    if (!Array.isArray(rawServices)) return [];
    return rawServices.filter((s) => s.active !== false);
  }, [rawServices]);

  // Data selecionada no formato YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  // Normalização dos agendamentos vindos do backend
  const allNormalizedAppointments = useMemo(() => {
    if (!Array.isArray(rawAppointments)) return [];

    return rawAppointments.map((apt) => {
      const barber = barbers.find((b) => b.id === apt.barber_id);
      const client = (Array.isArray(rawClients) ? rawClients : []).find(
        (c) => c.id === apt.client_id || (c.name && c.name.toLowerCase() === (apt.client_name || "").toLowerCase())
      );

      const duration = Number(apt.duration_min || 45);
      const timeStr = apt.time || "10:00";
      const [h, m] = timeStr.split(":").map(Number);
      const endTotal = (h || 0) * 60 + (m || 0) + duration;
      const endH = String(Math.floor(endTotal / 60)).padStart(2, "0");
      const endM = String(endTotal % 60).padStart(2, "0");
      const endTime = `${endH}:${endM}`;

      let visualStatus = apt.status || "confirmado";
      if (visualStatus === "cadeira") visualStatus = "em_atendimento";

      return {
        id: apt.id,
        barberId: apt.barber_id || barbers[0]?.id,
        barberName: barber?.fullName || apt.barber_name || "Barbeiro",
        barberAvatar: barber?.avatar || "",
        clientId: apt.client_id,
        clientName: apt.client_name || "Cliente",
        clientPhone: apt.client_phone || client?.phone || "",
        clientAvatar: client?.avatar || client?.photo || "",
        serviceName: apt.service_names?.join(" + ") || apt.service_name || "Corte Tradicional",
        startTime: timeStr,
        endTime: endTime,
        durationMinutes: duration,
        status: visualStatus,
        price: Number(apt.price || 50),
        date: apt.date || selectedDateStr,
        notes: apt.notes || "",
      };
    });
  }, [rawAppointments, barbers, rawClients, selectedDateStr]);

  // Agendamentos filtrados para o dia selecionado e status
  const appointmentsForSelectedDate = useMemo(() => {
    return allNormalizedAppointments.filter((apt) => apt.date === selectedDateStr);
  }, [allNormalizedAppointments, selectedDateStr]);

  const visibleAppointments = useMemo(() => {
    if (selectedStatus === "all") return appointmentsForSelectedDate;
    return appointmentsForSelectedDate.filter((apt) => apt.status === selectedStatus);
  }, [appointmentsForSelectedDate, selectedStatus]);

  // Resumo do dia calculado a partir dos agendamentos reais do dia
  const dailySummary = useMemo(() => {
    const list = appointmentsForSelectedDate;
    const total = list.length;
    const confirmed = list.filter((a) => a.status === "confirmado" || a.status === "em_atendimento" || a.status === "concluido").length;
    const pending = list.filter((a) => a.status === "pendente" || a.status === "agendado").length;
    const cancelled = list.filter((a) => a.status === "cancelado").length;

    return { total, confirmed, pending, cancelled };
  }, [appointmentsForSelectedDate]);

  // Próximos agendamentos derivados dos registros reais
  const upcomingAppointments = useMemo(() => {
    const sorted = [...appointmentsForSelectedDate]
      .filter((a) => a.status !== "cancelado")
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return sorted.slice(0, 5).map((apt) => ({
      id: apt.id,
      clientName: apt.clientName,
      clientAvatar: apt.clientAvatar,
      serviceName: apt.serviceName,
      time: apt.startTime,
      status: apt.status,
      barberName: apt.barberName,
    }));
  }, [appointmentsForSelectedDate]);

  // Formatação de data em português
  const formattedDate = useMemo(() => {
    const weekdays = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];
    const months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const w = weekdays[selectedDate.getDay()];
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const m = months[selectedDate.getMonth()];
    const y = selectedDate.getFullYear();
    return `${w}, ${d} de ${m} de ${y}`;
  }, [selectedDate]);

  // Controles de navegação de data
  const handlePrevDay = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  };

  const handleFirstDay = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Adicionar novo agendamento e sincronizar
  const handleAddAppointment = () => {
    setRefreshTick((t) => t + 1);
    reloadApts();
  };

  // Atualizar status de agendamento
  const handleStatusUpdate = () => {
    setRefreshTick((t) => t + 1);
    reloadApts();
  };

  // Clique em slot vazio da grade abre o modal pré-preenchido
  const handleEmptySlotClick = (barberId, time) => {
    setNewSlotData({ barberId, time });
    setNewModalOpen(true);
  };

  return (
    <div
      className="space-y-4 sm:space-y-5 lg:space-y-6 w-full max-w-[1600px] mx-auto pb-24 sm:pb-28 lg:pb-12 antialiased select-none overflow-x-hidden"
      data-testid="agenda-page"
    >
      {/* ======================================================== */}
      {/* 1. TÍTULO DA PÁGINA + BOTÃO NOVO AGENDAMENTO DOURADO      */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Agenda
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Organize seus agendamentos e gerencie sua rotina
          </p>
        </div>

        {/* Botão Oficial Dourado: + Novo Agendamento */}
        <button
          type="button"
          onClick={() => {
            setNewSlotData({ barberId: null, time: null });
            setNewModalOpen(true);
          }}
          className="h-[46px] sm:h-[48px] px-5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C365] hover:brightness-110 text-[#070A0F] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          data-testid="new-appointment-btn"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. BARRA DE CONTROLE DA AGENDA (Toolbar Compacta)         */}
      {/* ======================================================== */}
      <AgendaToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentDateFormatted={formattedDate}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onFirstDay={handleFirstDay}
        onToday={handleToday}
        selectedBarberId={selectedBarberId}
        onBarberChange={setSelectedBarberId}
        barbers={barbers}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* ======================================================== */}
      {/* 3. ESTRUTURA GERAL: AGENDA PRINCIPAL + PAINEL LATERAL    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 w-full items-start">
        {/* Coluna Esquerda: Agenda Principal (Horários x Barbeiros) */}
        <div className="xl:col-span-8 2xl:col-span-9 min-w-0 w-full">
          {loadingApts && barbers.length === 0 ? (
            <div className="rounded-2xl bg-[#0A0E15] border border-[#161E2C] p-12 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#E5C365]" />
              <p className="text-xs sm:text-sm text-slate-400">Carregando agendamentos da barbearia...</p>
            </div>
          ) : (
            <CalendarGrid
              barbers={barbers}
              appointments={visibleAppointments}
              onSelectAppointment={(apt) => setSelectedAppointment(apt)}
              onEmptySlotClick={handleEmptySlotClick}
              selectedBarberId={selectedBarberId}
            />
          )}
        </div>

        {/* Coluna Direita: Painel Lateral com 3 Blocos */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-4 sm:space-y-5 min-w-0 w-full">
          {/* Bloco 1: Mini Calendário Mensal */}
          <MiniCalendar
            selectedDate={selectedDate}
            onDateSelect={(newD) => setSelectedDate(newD)}
          />

          {/* Bloco 2: Resumo do Dia Dinâmico Real */}
          <DailySummary
            total={dailySummary.total}
            confirmed={dailySummary.confirmed}
            pending={dailySummary.pending}
            cancelled={dailySummary.cancelled}
          />

          {/* Bloco 3: Próximos Agendamentos Reais */}
          <UpcomingAppointments
            appointments={upcomingAppointments}
            onSelectAppointment={(item) => {
              const fullApt = allNormalizedAppointments.find((a) => a.id === item.id) || item;
              setSelectedAppointment(fullApt);
            }}
            onViewAll={() => setSelectedBarberId("all")}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODAIS INTERATIVOS (Novo Agendamento & Detalhes)       */}
      {/* ======================================================== */}
      <NewAppointmentModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onAddAppointment={handleAddAppointment}
        initialBarberId={newSlotData.barberId}
        initialTime={newSlotData.time}
        initialDate={selectedDateStr}
        barbers={barbers}
        services={services}
      />

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        onStatusUpdate={handleStatusUpdate}
        barbers={barbers}
      />
    </div>
  );
}
