import React from "react";
import { X, SlidersHorizontal, RotateCcw, Check } from "lucide-react";

export default function AdvancedFiltersDrawer({
  isOpen,
  onClose,
  statusFilter = "all",
  onStatusChange,
  barberFilter = "all",
  onBarberChange,
  barbers = [],
  paymentFilter = "all",
  onPaymentChange,
  paymentMethods = [],
  serviceFilter = "all",
  onServiceChange,
  onResetFilters,
  activeCount = 0,
}) {
  if (!isOpen) return null;

  const STATUS_OPTIONS = [
    { id: "all", label: "Todos os status" },
    { id: "finalizado", label: "Finalizado" },
    { id: "em_andamento", label: "Em andamento" },
    { id: "cancelado", label: "Cancelado" },
  ];

  const SERVICE_OPTIONS = [
    { id: "all", label: "Todos os serviços" },
    { id: "Corte Masculino", label: "Corte Masculino" },
    { id: "Barba", label: "Barba" },
    { id: "Degradê", label: "Degradê" },
    { id: "Sobrancelha", label: "Sobrancelha" },
    { id: "Corte + Barba", label: "Corte + Barba" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto antialiased animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-[#0A0E15] border border-[#161E2C] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#161E2C] bg-[#0D121B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Filtros Avançados
                </h2>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#E5C365] text-[#070A0F] text-[10px] font-black">
                    {activeCount} ativo{activeCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Refine a listagem de atendimentos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo dos Filtros com Scroll Interno */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* 1. Status */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Status do Atendimento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((st) => {
                const isSelected = statusFilter === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onStatusChange?.(st.id)}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] shadow-sm"
                        : "bg-[#0D121B] border-[#161E2C] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span>{st.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Barbeiro */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Barbeiro Responsável
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onBarberChange?.("all")}
                className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  barberFilter === "all"
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] shadow-sm"
                    : "bg-[#0D121B] border-[#161E2C] text-slate-300 hover:border-slate-700"
                }`}
              >
                <span>Todos</span>
                {barberFilter === "all" && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </button>
              {barbers.map((b) => {
                const isSelected = barberFilter === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onBarberChange?.(b.id)}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] shadow-sm"
                        : "bg-[#0D121B] border-[#161E2C] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="truncate">{b.shortName || b.name}</span>
                    {b.isDono && (
                      <span className="text-[9px] px-1 py-0.2 rounded font-black uppercase bg-[#D4AF37]/25 text-[#E5C365] shrink-0">
                        Dono
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Forma de Pagamento */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onPaymentChange?.("all")}
                className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  paymentFilter === "all"
                    ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] shadow-sm"
                    : "bg-[#0D121B] border-[#161E2C] text-slate-300 hover:border-slate-700"
                }`}
              >
                <span>Todas</span>
                {paymentFilter === "all" && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </button>
              {paymentMethods.map((pm) => {
                const isSelected = paymentFilter === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => onPaymentChange?.(pm.id)}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] shadow-sm"
                        : "bg-[#0D121B] border-[#161E2C] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="truncate">{pm.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Serviços */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Serviços Realizados
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((srv) => {
                const isSelected = serviceFilter === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => onServiceChange?.(srv.id)}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#D4AF37]/15 border-[#D4AF37] text-[#E5C365] shadow-sm"
                        : "bg-[#0D121B] border-[#161E2C] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="truncate">{srv.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer com Limpar e Aplicar */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#161E2C] bg-[#0D121B] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3.5 py-2 rounded-xl border border-[#161E2C] hover:bg-white/5 text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C365] hover:brightness-110 text-[#070A0F] text-xs font-black shadow-lg shadow-[#D4AF37]/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}
