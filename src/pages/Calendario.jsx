import React, { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import AgendaToolbar from "@/components/agenda/AgendaToolbar";
import CalendarGrid from "@/components/agenda/CalendarGrid";
import MiniCalendar from "@/components/agenda/MiniCalendar";
import DailySummary from "@/components/agenda/DailySummary";
import UpcomingAppointments from "@/components/agenda/UpcomingAppointments";
import NewAppointmentModal from "@/components/agenda/NewAppointmentModal";
import AppointmentDetailsModal from "@/components/agenda/AppointmentDetailsModal";
import {
  BARBERS,
  INITIAL_APPOINTMENTS,
  UPCOMING_APPOINTMENTS,
  DAILY_SUMMARY_DATA,
} from "@/data/agendaData";

export default function Calendario() {
  const [viewMode, setViewMode] = useState("dia");
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 9, 6)); // 06 de Outubro de 2026 (terça-feira)
  const [selectedBarberId, setSelectedBarberId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newSlotData, setNewSlotData] = useState({ barberId: null, time: null });

  // Formatação de data em português: "Segunda-feira, 06 de Outubro de 2026"
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
    setSelectedDate(new Date(2026, 9, 6)); // Retorna à data de referência do gabarito
  };

  // Filtragem de agendamentos por status
  const visibleAppointments = useMemo(() => {
    if (selectedStatus === "all") return appointments;
    return appointments.filter((apt) => apt.status === selectedStatus);
  }, [appointments, selectedStatus]);

  // Adicionar novo agendamento
  const handleAddAppointment = (newApt) => {
    setAppointments((prev) => [newApt, ...prev]);
  };

  // Atualizar status de agendamento (Iniciar atendimento, cancelar, etc.)
  const handleStatusUpdate = (aptId, newStatus) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === aptId ? { ...apt, status: newStatus } : apt))
    );
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
          className="h-[46px] sm:h-[48px] px-5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C365] text-[#070A0F] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/10 active:scale-95 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
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
        barbers={BARBERS}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* ======================================================== */}
      {/* 3. ESTRUTURA GERAL: AGENDA PRINCIPAL (72%) + PAINEL (28%) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 w-full items-start">
        {/* Coluna Esquerda: Agenda Principal (Horários x Barbeiros) */}
        <div className="xl:col-span-8 2xl:col-span-9 min-w-0 w-full">
          <CalendarGrid
            barbers={BARBERS}
            appointments={visibleAppointments}
            onSelectAppointment={(apt) => setSelectedAppointment(apt)}
            onEmptySlotClick={handleEmptySlotClick}
            selectedBarberId={selectedBarberId}
          />
        </div>

        {/* Coluna Direita: Painel Lateral com 3 Blocos Fiel ao Gabarito */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-4 sm:space-y-5 min-w-0 w-full">
          {/* Bloco 1: Mini Calendário Mensal com dia selecionado */}
          <MiniCalendar
            selectedDate={selectedDate}
            onDateSelect={(newD) => setSelectedDate(newD)}
          />

          {/* Bloco 2: Resumo do Dia (12 agendamentos, 10 confirmados, 1 pendente, 1 cancelado) */}
          <DailySummary
            total={DAILY_SUMMARY_DATA.totalAppointments}
            confirmed={DAILY_SUMMARY_DATA.confirmedAppointments}
            pending={DAILY_SUMMARY_DATA.pendingAppointments}
            cancelled={DAILY_SUMMARY_DATA.cancelledAppointments}
          />

          {/* Bloco 3: Próximos Agendamentos */}
          <UpcomingAppointments
            appointments={UPCOMING_APPOINTMENTS}
            onSelectAppointment={(apt) => {
              // Buscar o agendamento completo se existir ou abrir modal
              const fullApt = appointments.find((a) => a.clientName === apt.clientName) || {
                ...apt,
                startTime: apt.time,
                endTime: "17:30",
                durationMinutes: 60,
                clientPhone: "(11) 98765-4321",
                price: 65.0,
                notes: "Agendamento da lista de próximos horários.",
              };
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
      />

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
