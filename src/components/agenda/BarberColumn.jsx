import React from "react";
import AppointmentCard from "./AppointmentCard";

const HOUR_HEIGHT = 80; // Altura de cada bloco de 1 hora em pixels
const START_HOUR = 8; // 08:00
const TOTAL_HOURS = 12; // 08:00 até 20:00 (12 horas)

export default function BarberColumn({
  barber,
  appointments = [],
  onSelectAppointment,
  onEmptySlotClick,
}) {
  const getMinutesFromStart = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h - START_HOUR) * 60 + (m || 0);
  };

  return (
    <div className="flex flex-col flex-1 min-w-[200px] border-r border-[#161E2C] last:border-r-0 select-none">
      {/* 1. Cabeçalho do Barbeiro Fiel ao Gabarito */}
      <div className="h-16 px-3 flex items-center justify-center gap-2.5 border-b border-[#161E2C] bg-[#0A0E15]/80 shrink-0">
        <div className="relative shrink-0">
          <img
            src={barber.avatar}
            alt={barber.name}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-[#161E2C]"
          />
          {barber.active && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#20C997] ring-2 ring-[#0A0E15]"
              title="Disponível hoje"
            />
          )}
        </div>
        <div className="text-left min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
            {barber.name}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium leading-tight">
            {barber.role}
          </p>
        </div>
      </div>

      {/* 2. Área dos Horários com Slots e Agendamentos Posicionados com Precisão */}
      <div
        className="relative w-full"
        style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
      >
        {/* Linhas Horizontais de Fundo para cada hora */}
        {Array.from({ length: TOTAL_HOURS }).map((_, idx) => {
          const hour = START_HOUR + idx;
          const timeLabel = `${String(hour).padStart(2, "0")}:00`;
          return (
            <div
              key={idx}
              onClick={() => onEmptySlotClick?.(barber.id, timeLabel)}
              style={{
                top: `${idx * HOUR_HEIGHT}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
              className="absolute left-0 right-0 border-b border-[#161E2C]/40 hover:bg-white/[0.015] transition-colors cursor-pointer group"
              title={`Clique para agendar às ${timeLabel} com ${barber.name}`}
            />
          );
        })}

        {/* Agendamentos do Barbeiro */}
        {appointments.map((apt) => {
          const startMinutes = getMinutesFromStart(apt.startTime);
          const duration = apt.durationMinutes || 60;
          const topPx = (startMinutes / 60) * HOUR_HEIGHT + 4;
          const heightPx = (duration / 60) * HOUR_HEIGHT - 8;

          return (
            <div
              key={apt.id}
              style={{
                position: "absolute",
                top: `${topPx}px`,
                height: `${Math.max(heightPx, 64)}px`,
                left: "6px",
                right: "6px",
              }}
            >
              <AppointmentCard
                appointment={apt}
                onClick={onSelectAppointment}
                style={{ height: "100%" }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
