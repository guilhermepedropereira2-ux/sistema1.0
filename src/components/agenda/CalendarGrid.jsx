import React, { useState, useEffect } from "react";
import BarberColumn from "./BarberColumn";

const HOUR_HEIGHT = 80;
const START_HOUR = 8;
const TOTAL_HOURS = 12;

export default function CalendarGrid({
  barbers = [],
  appointments = [],
  onSelectAppointment,
  onEmptySlotClick,
  selectedBarberId = "all",
}) {
  const [activeMobileBarber, setActiveMobileBarber] = useState(barbers[0]?.id || "barber-1");
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Atualização em tempo real do horário atual do dispositivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    };
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filtro de barbeiros
  const filteredBarbers =
    selectedBarberId === "all"
      ? barbers
      : barbers.filter((b) => b.id === selectedBarberId);

  // Posição da linha de horário atual (em pixels a partir de 08:00)
  const startDayMinutes = START_HOUR * 60; // 480
  const endDayMinutes = (START_HOUR + TOTAL_HOURS) * 60; // 1200 (20:00)
  const isWithinDay = currentMinutes >= startDayMinutes && currentMinutes <= endDayMinutes;
  
  // Posição visual da linha do horário
  const currentLineTopPx = isWithinDay
    ? ((currentMinutes - startDayMinutes) / 60) * HOUR_HEIGHT + 64 // 64px é a altura do cabeçalho
    : ((16 * 60 + 30 - startDayMinutes) / 60) * HOUR_HEIGHT + 64; // fallback demonstrativo caso fora de horário comercial (16:30)

  const currentFormattedTime = isWithinDay
    ? `${String(Math.floor(currentMinutes / 60)).padStart(2, "0")}:${String(currentMinutes % 60).padStart(2, "0")}`
    : "16:30";

  return (
    <div className="rounded-2xl bg-[#0A0E15] border border-[#161E2C] shadow-2xl overflow-hidden flex flex-col w-full relative">
      {/* Seletor Mobile de Barbeiros (Tabs Horizontais para visualização cristalina no celular) */}
      <div className="lg:hidden flex items-center gap-1.5 p-2 bg-[#070A0F] border-b border-[#161E2C] overflow-x-auto scrollbar-none">
        {barbers.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setActiveMobileBarber(b.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeMobileBarber === b.id
                ? "bg-[#E5C365] text-[#070A0F] shadow-sm font-bold"
                : "text-slate-400 bg-[#0D121B] hover:text-white"
            }`}
          >
            <img src={b.avatar} alt={b.name} className="w-4 h-4 rounded-full object-cover" />
            <span>{b.name}</span>
          </button>
        ))}
      </div>

      {/* Grade Principal com Coluna de Horários e Colunas de Barbeiros */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 relative w-full">
        <div className="flex min-w-[700px] lg:min-w-full relative">
          {/* Coluna de Horários à Esquerda */}
          <div className="w-14 sm:w-16 shrink-0 border-r border-[#161E2C] bg-[#070A0F]/60 flex flex-col select-none">
            {/* Espaço reservado para o cabeçalho */}
            <div className="h-16 border-b border-[#161E2C]" />

            {/* Marcadores de Horários */}
            <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
              {Array.from({ length: TOTAL_HOURS }).map((_, idx) => {
                const hour = START_HOUR + idx;
                const label = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div
                    key={idx}
                    style={{ top: `${idx * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    className="absolute left-0 right-0 flex items-start justify-center pt-2 text-[11px] font-semibold text-slate-400"
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Colunas dos Barbeiros */}
          <div className="flex-1 flex">
            {/* No Desktop / Tablet: exibe todos os barbeiros filtrados */}
            <div className="hidden lg:flex flex-1">
              {filteredBarbers.map((barber) => {
                const barberApts = appointments.filter((a) => a.barberId === barber.id);
                return (
                  <BarberColumn
                    key={barber.id}
                    barber={barber}
                    appointments={barberApts}
                    onSelectAppointment={onSelectAppointment}
                    onEmptySlotClick={onEmptySlotClick}
                  />
                );
              })}
            </div>

            {/* No Mobile: exibe o barbeiro selecionado nas abas com conforto total */}
            <div className="flex lg:hidden flex-1">
              {filteredBarbers
                .filter((b) => b.id === activeMobileBarber)
                .map((barber) => {
                  const barberApts = appointments.filter((a) => a.barberId === barber.id);
                  return (
                    <BarberColumn
                      key={barber.id}
                      barber={barber}
                      appointments={barberApts}
                      onSelectAppointment={onSelectAppointment}
                      onEmptySlotClick={onEmptySlotClick}
                    />
                  );
                })}
            </div>
          </div>

          {/* Linha do Horário Atual Dinâmica (Fiel à Imagem com Marcador Dourado) */}
          <div
            style={{ top: `${currentLineTopPx}px` }}
            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center transition-all duration-300"
          >
            {/* Tag do horário */}
            <div className="bg-[#E5C365] text-[#070A0F] font-black text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md shadow-lg ml-1 shrink-0">
              {currentFormattedTime}
            </div>
            {/* Linha dourada estendida */}
            <div className="flex-1 h-[2px] bg-gradient-to-r from-[#E5C365] via-[#D4AF37] to-[#E5C365]/30 shadow-[0_0_8px_rgba(229,195,101,0.5)]" />
            <div className="w-2 h-2 rounded-full bg-[#E5C365] -ml-1 shadow-[0_0_6px_#E5C365]" />
          </div>
        </div>
      </div>
    </div>
  );
}
