import React, { useState } from "react";
import { Search, ChevronDown, Calendar as CalendarIcon, SlidersHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import CustomDateModal from "./CustomDateModal";
import AdvancedFiltersDrawer from "./AdvancedFiltersDrawer";

export default function AtendimentosFilters({
  period = "hoje",
  onPeriodChange,
  customStartDate = "2026-10-01",
  customEndDate = "2026-10-06",
  onCustomDateChange,
  barberFilter = "all",
  onBarberFilterChange,
  barbers = [],
  paymentFilter = "all",
  onPaymentFilterChange,
  paymentMethods = [],
  statusFilter = "all",
  onStatusFilterChange,
  serviceFilter = "all",
  onServiceFilterChange,
  searchQuery = "",
  onSearchChange,
  onResetFilters,
  activeFiltersCount = 0,
}) {
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
  const [isAdvancedDrawerOpen, setIsAdvancedDrawerOpen] = useState(false);

  const selectedBarber = barbers.find((b) => b.id === barberFilter);
  const barberLabel = selectedBarber ? selectedBarber.shortName : "Todos os barbeiros";

  const selectedPayment = paymentMethods.find((p) => p.id === paymentFilter);
  const paymentLabel = selectedPayment ? selectedPayment.name : "Todas as formas de pagamento";

  // Formatação curta para botão de período personalizado quando ativo
  const formatShortDate = (dStr) => {
    if (!dStr) return "";
    const parts = dStr.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 w-full select-none">
      {/* ======================================================== */}
      {/* Linha Desktop: Filtros de período + Dropdowns + Busca     */}
      {/* ======================================================== */}
      <div className="hidden lg:flex items-center justify-between gap-3 flex-wrap">
        {/* Pílulas de Período */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#0D121B] border border-[#161E2C] text-xs font-semibold">
          {["hoje", "ontem", "7dias", "30dias", "personalizado"].map((p) => {
            const labels = {
              hoje: "Hoje",
              ontem: "Ontem",
              "7dias": "7 dias",
              "30dias": "30 dias",
              personalizado:
                period === "personalizado" && customStartDate && customEndDate
                  ? `${formatShortDate(customStartDate)} → ${formatShortDate(customEndDate)}`
                  : "Personalizado",
            };
            const isActive = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (p === "personalizado") {
                    setIsCustomDateModalOpen(true);
                  } else {
                    onPeriodChange?.(p);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#E5C365] text-[#070A0F] font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>{labels[p]}</span>
                {p === "personalizado" && <CalendarIcon className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Dropdowns + Busca + Botão Filtros */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl justify-end">
          {/* Dropdown Barbeiros */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex items-center justify-between gap-2 h-9 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer min-w-[170px] ${
                  barberFilter !== "all"
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] font-bold"
                    : "bg-[#0D121B] border-[#161E2C] hover:border-[#D4AF37]/40 text-slate-300 hover:text-white"
                }`}
              >
                <span className="truncate">{barberLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[#0D121B] border border-[#161E2C] text-white p-1 rounded-xl shadow-xl z-50">
              <DropdownMenuItem
                onClick={() => onBarberFilterChange?.("all")}
                className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                  barberFilter === "all" ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                Todos os barbeiros
              </DropdownMenuItem>
              {barbers.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => onBarberFilterChange?.(b.id)}
                  className={`text-xs px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between ${
                    barberFilter === b.id ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span>{b.name}</span>
                  {b.isDono && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-[#D4AF37]/20 text-[#E5C365]">
                      Dono
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown Pagamento */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex items-center justify-between gap-2 h-9 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer min-w-[190px] ${
                  paymentFilter !== "all"
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] font-bold"
                    : "bg-[#0D121B] border-[#161E2C] hover:border-[#D4AF37]/40 text-slate-300 hover:text-white"
                }`}
              >
                <span className="truncate">{paymentLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0D121B] border border-[#161E2C] text-white p-1 rounded-xl shadow-xl z-50">
              <DropdownMenuItem
                onClick={() => onPaymentFilterChange?.("all")}
                className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                  paymentFilter === "all" ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                Todas as formas de pagamento
              </DropdownMenuItem>
              {paymentMethods.map((pm) => (
                <DropdownMenuItem
                  key={pm.id}
                  onClick={() => onPaymentFilterChange?.(pm.id)}
                  className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                    paymentFilter === pm.id ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {pm.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Campo de Busca */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar atendimentos..."
              className="h-9 pl-9 pr-3 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white placeholder-slate-500 w-full transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botão de Filtros Avançados (Desktop) */}
          <button
            type="button"
            onClick={() => setIsAdvancedDrawerOpen(true)}
            className={`relative h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              activeFiltersCount > 0
                ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#E5C365]"
                : "bg-[#0D121B] border-[#161E2C] hover:border-[#D4AF37]/40 text-slate-400 hover:text-white"
            }`}
            title="Filtros avançados"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E5C365] text-[#070A0F] text-[10px] font-black flex items-center justify-center shadow-md">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Versão Mobile / Tablet: Organizada em Linhas              */}
      {/* ======================================================== */}
      <div className="flex lg:hidden flex-col gap-2.5 w-full">
        {/* Linha 1: Períodos */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#0D121B] border border-[#161E2C] text-xs font-semibold shrink-0">
            {["hoje", "ontem", "7dias", "30dias"].map((p) => {
              const labels = { hoje: "Hoje", ontem: "Ontem", "7dias": "7 dias", "30dias": "30 dias" };
              const isActive = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange?.(p)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#E5C365] text-[#070A0F] font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Botão de Calendário (Mobile) - Clicável com Modal de Período Personalizado */}
          <button
            type="button"
            onClick={() => setIsCustomDateModalOpen(true)}
            title="Período Personalizado"
            className={`h-9 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              period === "personalizado"
                ? "bg-[#E5C365] text-[#070A0F] border-[#E5C365] font-bold shadow-sm"
                : "bg-[#0D121B] border-[#161E2C] text-slate-400 hover:text-white"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            {period === "personalizado" && customStartDate && customEndDate && (
              <span className="text-[11px] font-mono">
                {formatShortDate(customStartDate)}→{formatShortDate(customEndDate)}
              </span>
            )}
          </button>
        </div>

        {/* Linha 2: Dropdown Barbeiros + Dropdown Pagamento */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex items-center justify-between gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium w-full truncate ${
                  barberFilter !== "all"
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] font-bold"
                    : "bg-[#0D121B] border-[#161E2C] text-slate-300"
                }`}
              >
                <span className="truncate">{barberLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 bg-[#0D121B] border border-[#161E2C] text-white p-1 rounded-xl shadow-xl z-50">
              <DropdownMenuItem
                onClick={() => onBarberFilterChange?.("all")}
                className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                  barberFilter === "all" ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300"
                }`}
              >
                Todos os barbeiros
              </DropdownMenuItem>
              {barbers.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => onBarberFilterChange?.(b.id)}
                  className={`text-xs px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between ${
                    barberFilter === b.id ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300"
                  }`}
                >
                  <span>{b.name}</span>
                  {b.isDono && (
                    <span className="text-[9px] px-1 rounded font-bold uppercase bg-[#D4AF37]/20 text-[#E5C365]">
                      Dono
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex items-center justify-between gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium w-full truncate ${
                  paymentFilter !== "all"
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] font-bold"
                    : "bg-[#0D121B] border-[#161E2C] text-slate-300"
                }`}
              >
                <span className="truncate">{paymentLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0D121B] border border-[#161E2C] text-white p-1 rounded-xl shadow-xl z-50">
              <DropdownMenuItem
                onClick={() => onPaymentFilterChange?.("all")}
                className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                  paymentFilter === "all" ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300"
                }`}
              >
                Todas as formas de pagamento
              </DropdownMenuItem>
              {paymentMethods.map((pm) => (
                <DropdownMenuItem
                  key={pm.id}
                  onClick={() => onPaymentFilterChange?.(pm.id)}
                  className={`text-xs px-3 py-2 rounded-lg cursor-pointer ${
                    paymentFilter === pm.id ? "bg-[#D4AF37]/15 text-[#E5C365] font-bold" : "text-slate-300"
                  }`}
                >
                  {pm.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Linha 3: Campo de Busca com Botão de Ajustes Funcional */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar atendimentos..."
              className="h-10 pl-9 pr-8 rounded-xl bg-[#0D121B] border border-[#161E2C] focus:border-[#D4AF37] focus:outline-none text-xs text-white placeholder-slate-500 w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botão de Ajustes com Indicador de Filtros Ativos (Mobile) */}
          <button
            type="button"
            onClick={() => setIsAdvancedDrawerOpen(true)}
            className={`relative h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
              activeFiltersCount > 0
                ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#E5C365]"
                : "bg-[#0D121B] border-[#161E2C] text-slate-400 hover:text-white"
            }`}
            title="Filtros avançados"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E5C365] text-[#070A0F] text-[10px] font-black flex items-center justify-center shadow-md">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL DE PERÍODO PERSONALIZADO                           */}
      {/* ======================================================== */}
      <CustomDateModal
        isOpen={isCustomDateModalOpen}
        onClose={() => setIsCustomDateModalOpen(false)}
        initialStart={customStartDate}
        initialEnd={customEndDate}
        onApply={({ startDate, endDate }) => {
          onCustomDateChange?.({ startDate, endDate });
          onPeriodChange?.("personalizado");
        }}
      />

      {/* ======================================================== */}
      {/* DRAWER / MODAL DE FILTROS AVANÇADOS                      */}
      {/* ======================================================== */}
      <AdvancedFiltersDrawer
        isOpen={isAdvancedDrawerOpen}
        onClose={() => setIsAdvancedDrawerOpen(false)}
        statusFilter={statusFilter}
        onStatusChange={onStatusFilterChange}
        barberFilter={barberFilter}
        onBarberChange={onBarberFilterChange}
        barbers={barbers}
        paymentFilter={paymentFilter}
        onPaymentChange={onPaymentFilterChange}
        paymentMethods={paymentMethods}
        serviceFilter={serviceFilter}
        onServiceChange={onServiceFilterChange}
        onResetFilters={onResetFilters}
        activeCount={activeFiltersCount}
      />
    </div>
  );
}
