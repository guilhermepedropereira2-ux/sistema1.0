import React, { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import AtendimentosMetrics from "@/components/atendimentos/AtendimentosMetrics";
import AtendimentosFilters from "@/components/atendimentos/AtendimentosFilters";
import AtendimentosTable from "@/components/atendimentos/AtendimentosTable";
import NovoAtendimentoModal from "@/components/atendimentos/NovoAtendimentoModal";
import AtendimentoDetailsModal from "@/components/atendimentos/AtendimentoDetailsModal";
import {
  ATTENDANCE_BARBERS,
  PAYMENT_METHODS,
  INITIAL_ATTENDANCES,
  ATTENDANCE_SUMMARY_METRICS,
} from "@/data/atendimentosData";
import {
  filterAttendances,
  countActiveAdvancedFilters,
} from "@/lib/attendanceFilters";
import { toast } from "sonner";

export default function Atendimentos() {
  // Lista de atendimentos realizados
  const [attendances, setAttendances] = useState(INITIAL_ATTENDANCES);

  // Filtros de busca e período
  const [period, setPeriod] = useState("hoje");
  const [customStartDate, setCustomStartDate] = useState("2026-10-01");
  const [customEndDate, setCustomEndDate] = useState("2026-10-06");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtros avançados
  const [barberFilter, setBarberFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  // Modals
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [selectedAttendanceForModal, setSelectedAttendanceForModal] = useState(null);

  // Filtragem dos atendimentos combinando todos os critérios ativos
  const filteredAttendances = useMemo(() => {
    return filterAttendances(attendances, {
      period,
      customStartDate,
      customEndDate,
      barberFilter,
      paymentFilter,
      statusFilter,
      serviceFilter,
      searchQuery,
    });
  }, [
    attendances,
    period,
    customStartDate,
    customEndDate,
    barberFilter,
    paymentFilter,
    statusFilter,
    serviceFilter,
    searchQuery,
  ]);

  // Contagem de filtros avançados ativos para exibição do badge numérico no botão
  const activeFiltersCount = useMemo(() => {
    return countActiveAdvancedFilters({
      statusFilter,
      serviceFilter,
      barberFilter,
      paymentFilter,
      period,
      customStartDate,
      customEndDate,
    });
  }, [
    statusFilter,
    serviceFilter,
    barberFilter,
    paymentFilter,
    period,
    customStartDate,
    customEndDate,
  ]);

  // Limpar todos os filtros para o estado padrão
  const handleResetFilters = () => {
    setStatusFilter("all");
    setServiceFilter("all");
    setBarberFilter("all");
    setPaymentFilter("all");
    setPeriod("hoje");
    setSearchQuery("");
    toast.success("Todos os filtros foram redefinidos.");
  };

  // Recalcular métricas dinâmicas com base na listagem atual de atendimentos
  const computedMetrics = useMemo(() => {
    const list = filteredAttendances;
    const totalCount = list.length;
    const totalRevenue = list.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const totalDiscounts = list.reduce((sum, a) => sum + (Number(a.discount) || 0), 0);
    const totalCommissions = list.reduce((sum, a) => {
      const val = Number(a.value) || 0;
      return sum + (a.isBarberDono ? 0 : val * 0.4);
    }, 0);

    return {
      totalCount,
      countTrend: ATTENDANCE_SUMMARY_METRICS.countTrend,
      yesterdayCount: ATTENDANCE_SUMMARY_METRICS.yesterdayCount,
      totalRevenue,
      revenueTrend: ATTENDANCE_SUMMARY_METRICS.revenueTrend,
      yesterdayRevenue: ATTENDANCE_SUMMARY_METRICS.yesterdayRevenue,
      totalDiscounts,
      discountTrend: ATTENDANCE_SUMMARY_METRICS.discountTrend,
      yesterdayDiscount: ATTENDANCE_SUMMARY_METRICS.yesterdayDiscount,
      totalCommissions,
      commissionTrend: ATTENDANCE_SUMMARY_METRICS.commissionTrend,
      yesterdayCommission: ATTENDANCE_SUMMARY_METRICS.yesterdayCommission,
    };
  }, [filteredAttendances]);

  // Salvar novo atendimento
  const handleSaveNovoAtendimento = (newAttendance) => {
    setAttendances((prev) => [newAttendance, ...prev]);
  };

  // Excluir atendimento
  const handleDeleteAttendance = (id) => {
    setAttendances((prev) => prev.filter((a) => a.id !== id));
    toast.success("Registro de atendimento excluído com sucesso.");
  };

  return (
    <div
      className="space-y-4 sm:space-y-5 lg:space-y-6 w-full max-w-[1600px] mx-auto pb-24 sm:pb-28 lg:pb-12 antialiased select-none overflow-x-hidden"
      data-testid="atendimentos-page"
    >
      {/* ======================================================== */}
      {/* 1. TÍTULO DA PÁGINA + BOTÃO NOVO ATENDIMENTO DOURADO     */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Atendimentos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Registre os atendimentos realizados
          </p>
        </div>

        {/* Botão Oficial Dourado: + Novo Atendimento */}
        <button
          type="button"
          onClick={() => setIsNovoModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C365] hover:brightness-110 text-[#070A0F] font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
          data-testid="btn-novo-atendimento"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Atendimento</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. CARDS DE MÉTRICAS OPERACIONAIS                        */}
      {/* ======================================================== */}
      <AtendimentosMetrics metrics={computedMetrics} />

      {/* ======================================================== */}
      {/* 3. BARRA DE FILTROS & BUSCA EM TEMPO REAL                */}
      {/* ======================================================== */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#0A0E15] border border-[#161E2C] p-3 sm:p-4 shadow-xl">
        <AtendimentosFilters
          period={period}
          onPeriodChange={setPeriod}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomDateChange={({ startDate, endDate }) => {
            setCustomStartDate(startDate);
            setCustomEndDate(endDate);
            setPeriod("personalizado");
          }}
          barberFilter={barberFilter}
          onBarberFilterChange={setBarberFilter}
          barbers={ATTENDANCE_BARBERS}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={setPaymentFilter}
          paymentMethods={PAYMENT_METHODS}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onResetFilters={handleResetFilters}
          activeFiltersCount={activeFiltersCount}
        />
      </div>

      {/* ======================================================== */}
      {/* 4. TABELA / CARDS DE ATENDIMENTOS REALIZADOS             */}
      {/* ======================================================== */}
      <AtendimentosTable
        attendances={filteredAttendances}
        onSelectAttendance={(att) => setSelectedAttendanceForModal(att)}
        onDeleteAttendance={handleDeleteAttendance}
      />

      {/* ======================================================== */}
      {/* 5. MODAL DE NOVO ATENDIMENTO                             */}
      {/* ======================================================== */}
      <NovoAtendimentoModal
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onSave={handleSaveNovoAtendimento}
      />

      {/* ======================================================== */}
      {/* 6. MODAL DE DETALHES / COMPROVANTE                       */}
      {/* ======================================================== */}
      <AtendimentoDetailsModal
        attendance={selectedAttendanceForModal}
        isOpen={!!selectedAttendanceForModal}
        onClose={() => setSelectedAttendanceForModal(null)}
      />
    </div>
  );
}
