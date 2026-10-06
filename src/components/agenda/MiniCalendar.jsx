import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MiniCalendar({
  selectedDate = new Date(2026, 9, 6),
  onDateSelect,
}) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date(selectedDate));

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Dias com agendamentos (para exibir o pontinho discreto)
  const daysWithAppointments = [2, 4, 6, 8, 9, 13, 14, 16, 20, 21, 23, 27];

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const isSameDay = (day) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  return (
    <div className="rounded-2xl bg-[#0A0E15] border border-[#161E2C] p-4 sm:p-5 shadow-xl select-none">
      {/* Cabeçalho do Mini Calendário */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white tracking-tight">
          {monthNames[month]} de {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dias da Semana (D S T Q Q S S) */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map((d, i) => (
          <span key={i} className="text-[11px] font-bold text-slate-400">
            {d}
          </span>
        ))}
      </div>

      {/* Grade de Dias */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Espaços vazios antes do 1º dia */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7 w-7" />
        ))}

        {/* Dias do Mês */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const selected = isSameDay(day);
          const hasDot = daysWithAppointments.includes(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onDateSelect?.(new Date(year, month, day))}
              className={`h-7 w-7 mx-auto rounded-full flex flex-col items-center justify-center text-xs font-semibold relative transition-all cursor-pointer ${
                selected
                  ? "bg-[#E5C365] text-[#070A0F] font-black shadow-md scale-105"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{day}</span>
              {hasDot && !selected && (
                <span className="w-1 h-1 rounded-full bg-[#E5C365] absolute bottom-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
