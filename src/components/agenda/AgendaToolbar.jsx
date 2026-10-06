import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronDown,
  Filter,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function AgendaToolbar({
  viewMode = "dia",
  onViewModeChange,
  currentDateFormatted = "Segunda-feira, 06 de Outubro de 2026",
  onPrevDay,
  onNextDay,
  onFirstDay,
  onToday,
  selectedBarberId = "all",
  onBarberChange,
  barbers = [],
  selectedStatus = "all",
  onStatusChange,
}) {
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);
  const barberLabel = selectedBarber ? selectedBarber.name : "Todos os barbeiros";

  const statusLabels = {
    all: "Todos os status",
    confirmado: "Confirmado",
    pendente: "Pendente",
    cancelado: "Cancelado",
    em_atendimento: "Em atendimento",
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-transparent py-1 w-full select-none">
      {/* Lado Esquerdo: Modo de Exibição (Dia / Semana / Mês) + Navegação de Data */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Toggle Dia / Semana / Mês */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#0D121B] border border-[#161E2C] text-xs font-semibold">
          <button
            type="button"
            onClick={() => onViewModeChange?.("dia")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "dia"
                ? "bg-[#E5C365] text-[#070A0F] font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Dia
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange?.("semana")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "semana"
                ? "bg-[#E5C365] text-[#070A0F] font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange?.("mes")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "mes"
                ? "bg-[#E5C365] text-[#070A0F] font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mês
          </button>
        </div>

        {/* Setas de Navegação */}
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onFirstDay}
            title="Primeiro dia do mês"
            className="h-8 w-8 rounded-xl bg-[#0D121B] border border-[#161E2C] text-slate-400 hover:text-[#E5C365] hover:border-[#D4AF37]/40 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onPrevDay}
            title="Dia anterior"
            className="h-8 w-8 rounded-xl bg-[#0D121B] border border-[#161E2C] text-slate-400 hover:text-[#E5C365] hover:border-[#D4AF37]/40 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNextDay}
            title="Próximo dia"
            className="h-8 w-8 rounded-xl bg-[#0D121B] border border-[#161E2C] text-slate-400 hover:text-[#E5C365] hover:border-[#D4AF37]/40 flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Data selecionada */}
        <span className="text-xs sm:text-sm font-semibold text-slate-200 capitalize whitespace-nowrap px-1">
          {currentDateFormatted}
        </span>

        {/* Botão Hoje */}
        <button
          type="button"
          onClick={onToday}
          className="h-8 px-3 rounded-xl bg-[#0D121B] border border-[#161E2C] text-xs font-semibold text-slate-300 hover:text-white hover:border-[#D4AF37]/40 transition-all cursor-pointer flex items-center justify-center"
        >
          Hoje
        </button>
      </div>

      {/* Lado Direito: Filtros de Barbeiro e Status */}
      <div className="flex items-center gap-2 sm:gap-3 self-start lg:self-auto">
        {/* Dropdown: Barbeiros */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between gap-2.5 h-9 px-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/40 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer min-w-[170px]"
            >
              <span className="truncate">{barberLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#0D121B] border border-[#161E2C] text-white p-1 rounded-xl shadow-xl z-50">
            <DropdownMenuItem
              onClick={() => onBarberChange?.("all")}
              className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                selectedBarberId === "all" ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Todos os barbeiros
            </DropdownMenuItem>
            {barbers.map((b) => (
              <DropdownMenuItem
                key={b.id}
                onClick={() => onBarberChange?.(b.id)}
                className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                  selectedBarberId === b.id ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {b.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown: Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between gap-2.5 h-9 px-3.5 rounded-xl bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/40 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer min-w-[150px]"
            >
              <span className="truncate">{statusLabels[selectedStatus]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-[#0D121B] border border-[#161E2C] text-white p-1 rounded-xl shadow-xl z-50">
            {Object.entries(statusLabels).map(([key, label]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onStatusChange?.(key)}
                className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                  selectedStatus === key ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
