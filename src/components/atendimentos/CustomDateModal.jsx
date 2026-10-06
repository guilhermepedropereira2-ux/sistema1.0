import React, { useState } from "react";
import { X, Calendar as CalendarIcon, ArrowRight, Check } from "lucide-react";

export default function CustomDateModal({
  isOpen,
  onClose,
  initialStart = "2026-10-01",
  initialEnd = "2026-10-06",
  onApply,
}) {
  if (!isOpen) return null;

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  // Formatação amigável: "01/10/2026 → 06/10/2026"
  const formatDisplayDate = (dStr) => {
    if (!dStr) return "--/--/----";
    const [y, m, d] = dStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const handleApply = (e) => {
    e.preventDefault();
    onApply?.({ startDate, endDate });
    onClose?.();
  };

  const handlePreset = (daysBack) => {
    const end = "2026-10-06";
    const [y, m, d] = end.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - daysBack);
    const yStr = dateObj.getFullYear();
    const mStr = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dStr = String(dateObj.getDate()).padStart(2, "0");
    setStartDate(`${yStr}-${mStr}-${dStr}`);
    setEndDate(end);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto antialiased animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-[#0A0E15] border border-[#161E2C] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#161E2C] bg-[#0D121B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#E5C365]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Período Personalizado
              </h2>
              <p className="text-xs text-slate-400">
                Selecione o intervalo de datas desejado
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

        {/* Conteúdo */}
        <form onSubmit={handleApply} className="p-5 sm:p-6 space-y-4">
          {/* Preview do Período */}
          <div className="p-3 rounded-xl bg-[#0D121B] border border-[#161E2C] flex items-center justify-center gap-2 text-xs font-semibold text-slate-200">
            <span className="font-mono text-[#E5C365]">{formatDisplayDate(startDate)}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[#E5C365]">{formatDisplayDate(endDate)}</span>
          </div>

          {/* Atalhos Rápidos */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Atalhos Rápidos
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handlePreset(0)}
                className="py-1.5 px-2 rounded-lg bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/40 text-slate-300 hover:text-white transition-all text-center"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handlePreset(7)}
                className="py-1.5 px-2 rounded-lg bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/40 text-slate-300 hover:text-white transition-all text-center"
              >
                Últimos 7 dias
              </button>
              <button
                type="button"
                onClick={() => handlePreset(30)}
                className="py-1.5 px-2 rounded-lg bg-[#0D121B] border border-[#161E2C] hover:border-[#D4AF37]/40 text-slate-300 hover:text-white transition-all text-center"
              >
                Últimos 30 dias
              </button>
            </div>
          </div>

          {/* Seletores de Data Inicial e Final */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Data Inicial
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0D121B] border border-[#161E2C] text-xs text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Data Final
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0D121B] border border-[#161E2C] text-xs text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#161E2C] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C365] hover:brightness-110 text-[#070A0F] text-xs font-black flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Aplicar Período
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
